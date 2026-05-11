import { createClient } from 'npm:@supabase/supabase-js@2'
import webPush from 'npm:web-push@3'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webPush.setVapidDetails(
  'mailto:noreply@naughtylist.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const { displayName, clanTag, senderUserId } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch all subscriptions except the sender's own
    const query = supabase.from('push_subscriptions').select('subscription, user_id')
    if (senderUserId) {
      query.neq('user_id', senderUserId)
    }
    const { data: rows, error: dbError } = await query

    if (dbError) throw dbError

    const tag = clanTag ? `[${clanTag}] ` : ''
    const name = `${tag}${displayName || 'Someone'}`

    const payload = JSON.stringify({
      title: 'OPERATOR ONLINE',
      body: `${name} just dropped in. Gear up.`,
      url: '/',
    })

    const results = await Promise.allSettled(
      (rows ?? []).map((row) => webPush.sendNotification(row.subscription, payload)),
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
