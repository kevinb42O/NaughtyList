import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(first: string, second: string) {
  if (first.length !== second.length) return false
  let mismatch = 0
  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index)
  }
  return mismatch === 0
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured.')
  }

  const timestamp = signatureHeader.split(',').find((part) => part.startsWith('t='))?.slice(2)
  const signatures = signatureHeader.split(',').filter((part) => part.startsWith('v1=')).map((part) => part.slice(3))
  if (!timestamp || !signatures.length) {
    throw new Error('Invalid Stripe signature header.')
  }

  const signedPayload = `${timestamp}.${rawBody}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload)))

  if (!signatures.some((signature) => timingSafeEqual(signature, digest))) {
    throw new Error('Stripe signature verification failed.')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const rawBody = await req.text()
    await verifyStripeSignature(rawBody, req.headers.get('stripe-signature') ?? '')
    const event = JSON.parse(rawBody)

    if (event.type !== 'checkout.session.completed') {
      return jsonResponse({ received: true, ignored: event.type })
    }

    const session = event.data?.object ?? {}
    if (session.payment_status !== 'paid') {
      return jsonResponse({ received: true, ignored: 'unpaid_session' })
    }

    const profileId = session.metadata?.profile_id || session.client_reference_id || null
    const amountCents = Number(session.amount_total ?? 0)
    if (!profileId || !amountCents) {
      throw new Error('Stripe session missing profile or amount metadata.')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: existingDonation, error: lookupError } = await supabase
      .from('donations')
      .select('id')
      .eq('provider', 'stripe')
      .eq('provider_payment_id', session.id)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (!existingDonation) {
      const { error: insertError } = await supabase.from('donations').insert({
        profile_id: profileId,
        provider: 'stripe',
        provider_payment_id: session.id,
        amount_cents: amountCents,
        currency: session.currency || 'eur',
        status: 'confirmed',
        donor_name: session.customer_details?.name || null,
        donor_email: session.customer_details?.email || session.customer_email || null,
        donor_message: session.metadata?.donor_message || '',
        is_public: session.metadata?.is_public === 'true',
        confirmed_at: new Date().toISOString(),
        metadata: { event_id: event.id, payment_intent: session.payment_intent },
      })

      if (insertError) throw insertError
    }

    const { error: rewardError } = await supabase.rpc('recalculate_profile_supporter_reward', {
      target_profile_id: profileId,
    })
    if (rewardError) throw rewardError

    return jsonResponse({ received: true })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Donation webhook failed.' }, 400)
  }
})
