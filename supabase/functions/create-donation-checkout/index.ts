import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://21rats.app').replace(/\/$/, '')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

async function getRequestUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Login first so the reward can be attached to your profile.')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error('Invalid support checkout session.')
  return data.user
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe checkout is not configured yet.')
    }

    const user = await getRequestUser(req)
    const body = await req.json()
    const amountCents = Math.round(Number(body.amountCents ?? 0))
    const donorMessage = cleanString(body.donorMessage, 140)
    const isPublic = Boolean(body.isPublic)

    if (!Number.isFinite(amountCents) || amountCents < 300 || amountCents > 50000) {
      throw new Error('Support amount must be between €3 and €500.')
    }

    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${SITE_URL}/support?status=success`)
    params.set('cancel_url', `${SITE_URL}/support?status=cancelled`)
    params.set('client_reference_id', user.id)
    if (user.email) {
      params.set('customer_email', user.email)
    }
    params.set('metadata[profile_id]', user.id)
    params.set('metadata[donor_message]', donorMessage)
    params.set('metadata[is_public]', String(isPublic))
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'eur')
    params.set('line_items[0][price_data][unit_amount]', String(amountCents))
    params.set('line_items[0][price_data][product_data][name]', '21rats project support')
    params.set('line_items[0][price_data][product_data][description]', 'Cosmetic supporter reward. Core 21rats features stay free.')

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const data = await stripeResponse.json()
    if (!stripeResponse.ok) {
      throw new Error(data?.error?.message ?? 'Unable to create Stripe checkout session.')
    }

    return jsonResponse({ url: data.url, id: data.id })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to start checkout.' }, 400)
  }
})
