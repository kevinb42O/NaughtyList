import { createClient } from 'npm:@supabase/supabase-js@2'
import webPush from 'npm:web-push@3'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webPush.setVapidDetails(
  'mailto:noreply@21rats.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
}

function trimMessage(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 120)
}

function trimCustomText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function normalizeUrl(value: unknown) {
  if (typeof value !== 'string') return '/'
  const trimmed = value.trim()
  if (!trimmed) return '/'
  return trimmed.startsWith('/') && !trimmed.startsWith('//') ? trimmed.slice(0, 120) : '/'
}

function normalizeHandle(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
}

function mentionHandle(profile: { id?: string | null; display_name?: string | null }) {
  const displayName = normalizeHandle(profile.display_name || 'Unknown Operator')
  return displayName || `operator${String(profile.id ?? '').slice(0, 6)}`
}

function mentionTokens(value: unknown) {
  const matches = String(value ?? '').match(/@[a-zA-Z0-9_]+/g) ?? []
  return new Set(matches.map((token) => token.slice(1).toLowerCase()))
}

function hasEveryoneMention(value: unknown) {
  return /(^|\s)@all(?=$|\s|[.,!?;:])/i.test(String(value ?? ''))
}

async function getRequestUser(supabase: ReturnType<typeof createClient>, req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('You must be logged in to send push notifications')

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error('Invalid push notification session')

  return data.user
}

async function requireAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (data?.role !== 'admin') throw new Error('Only admins can send custom notifications')
}

async function requireModerator(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (data?.role !== 'admin' && data?.role !== 'moderator') {
    throw new Error('Only moderators and admins can tag @all')
  }
}

async function getProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, clan_tag')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function resolvePublicMention(supabase: ReturnType<typeof createClient>, messageId: unknown, requestUserId: string, fallbackMessage: unknown) {
  let messageBody = typeof fallbackMessage === 'string' ? fallbackMessage : ''
  let messageVerified = false

  if (typeof messageId === 'string' && messageId) {
    const { data, error } = await supabase
      .from('public_chat_messages')
      .select('id, user_id, body')
      .eq('id', messageId)
      .maybeSingle()

    if (error) throw error
    if (!data || data.user_id !== requestUserId) {
      throw new Error('Public mention message could not be verified')
    }

    messageBody = data.body || ''
    messageVerified = true
  }

  const tokens = mentionTokens(messageBody)
  if (!tokens.size && !hasEveryoneMention(messageBody)) {
    return { messageBody, messageVerified, mentionEveryone: false, recipientIds: [] as string[] }
  }

  const mentionEveryone = hasEveryoneMention(messageBody)
  if (mentionEveryone) {
    return { messageBody, messageVerified, mentionEveryone, recipientIds: [] as string[] }
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name')

  if (error) throw error

  const recipientIds = (profiles ?? [])
    .filter((profile) => profile.id !== requestUserId && tokens.has(mentionHandle(profile).toLowerCase()))
    .map((profile) => profile.id)
    .slice(0, 20)

  return { messageBody, messageVerified, mentionEveryone, recipientIds }
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
    const {
      type,
      displayName,
      clanTag,
      messageId,
      recipientUserId,
      recipientUserIds,
      message,
      title: customTitle,
      body: customBody,
      url: customUrl,
    } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const requestUser = await getRequestUser(supabase, req)

    if (type === 'push-stats' || type === 'push-history') {
      await requireAdmin(supabase, requestUser.id)

      const [
        { data: subscriptions, error: subscriptionError },
        { data: events, error: eventsError },
        { data: eventTotals, error: eventTotalError },
      ] = await Promise.all([
        supabase.from('push_subscriptions').select('user_id'),
        supabase
          .from('push_notification_events')
          .select('id, sender_id, title, body, target_url, sent_count, failed_count, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('push_notification_events').select('sent_count'),
      ])

      if (subscriptionError) throw subscriptionError
      if (eventsError) throw eventsError
      if (eventTotalError) throw eventTotalError

      const summary = {
        subscribed_users: new Set((subscriptions ?? []).map((row) => row.user_id)).size,
        active_subscriptions: subscriptions?.length ?? 0,
        sent_notifications: (eventTotals ?? []).reduce((total, event) => total + (event.sent_count ?? 0), 0),
      }

      return new Response(JSON.stringify({ summary, events: events ?? [] }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const isCustom = type === 'custom-notification'
    const isPublicMention = type === 'public-mention'
    const resolvedPublicMention = isPublicMention
      ? await resolvePublicMention(supabase, messageId, requestUser.id, message)
      : { messageBody: typeof message === 'string' ? message : '', messageVerified: false, mentionEveryone: false, recipientIds: [] as string[] }
    const isPublicMentionAll = isPublicMention && resolvedPublicMention.mentionEveryone
    if (isCustom) {
      await requireAdmin(supabase, requestUser.id)
    }

    if (isPublicMentionAll) {
      await requireModerator(supabase, requestUser.id)
    }

    const hintedPublicMentionRecipientIds = isPublicMention && !isPublicMentionAll && Array.isArray(recipientUserIds)
      ? recipientUserIds.filter((id) => typeof id === 'string' && id !== requestUser.id)
      : []
    const publicMentionRecipientIds = resolvedPublicMention.recipientIds.length
      ? resolvedPublicMention.recipientIds
      : resolvedPublicMention.messageVerified ? [] : hintedPublicMentionRecipientIds.slice(0, 20)

    if (isPublicMention && !isPublicMentionAll && !publicMentionRecipientIds.length) {
      return new Response(JSON.stringify({ sent: 0, failed: 0 }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const query = supabase.from('push_subscriptions').select('id, subscription, user_id')
    if (type === 'direct-message') {
      if (!recipientUserId) throw new Error('recipientUserId is required')
      query.eq('user_id', recipientUserId)
    }
    if (isPublicMention) {
      if (isPublicMentionAll) {
        query.neq('user_id', requestUser.id)
      } else if (!Array.isArray(recipientUserIds) || !recipientUserIds.length) {
        throw new Error('recipientUserIds is required')
      } else {
        query.in('user_id', publicMentionRecipientIds)
      }
    }

    const { data: rows, error: dbError } = await query

    if (dbError) throw dbError

    const senderProfile = await getProfile(supabase, requestUser.id)
    const resolvedDisplayName = senderProfile?.display_name || displayName || 'Someone'
    const resolvedClanTag = senderProfile?.clan_tag || clanTag || ''
    const tag = resolvedClanTag ? `[${resolvedClanTag}] ` : ''
    const name = `${tag}${resolvedDisplayName}`
    const title = trimCustomText(customTitle, 120)
    const body = trimCustomText(customBody, 400)
    const url = normalizeUrl(customUrl)

    if (isCustom && (!title || !body)) {
      throw new Error('Custom notifications need a title and message')
    }

    const payload = JSON.stringify(
      type === 'direct-message'
        ? {
            title: 'NEW DIRECT MESSAGE',
            body: `${name}: ${trimMessage(message)}`,
            url: `/messages?to=${requestUser.id}`,
            tag: `dm-${requestUser.id}`,
          }
        : isPublicMention
          ? {
              title: 'TAGGED IN PUBLIC CHAT',
              body: `${name}: ${trimMessage(resolvedPublicMention.messageBody || message)}`,
              url: '/chat',
              tag: isPublicMentionAll ? `public-mention-all-${requestUser.id}` : `public-mention-${requestUser.id}`,
            }
        : isCustom
          ? {
              title,
              body,
              url,
              tag: `admin-${Date.now()}`,
            }
          : {
            title: 'OPERATOR ONLINE',
            body: `${name} is online. Squad up.`,
            url: '/',
            tag: 'drop-in',
          },
    )

    const results = await Promise.allSettled(
      (rows ?? []).map((row) => webPush.sendNotification(row.subscription, payload)),
    )

    const deadSubscriptionIds = results
      .map((result, index) => ({ result, row: rows?.[index] }))
      .filter(({ result }) => {
        if (result.status !== 'rejected') return false
        const statusCode = (result.reason as { statusCode?: number })?.statusCode
        return statusCode === 404 || statusCode === 410
      })
      .map(({ row }) => row?.id)
      .filter(Boolean)

    if (deadSubscriptionIds.length) {
      await supabase.from('push_subscriptions').delete().in('id', deadSubscriptionIds)
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    if (isCustom) {
      await supabase.from('push_notification_events').insert({
        sender_id: requestUser.id,
        title,
        body,
        target_url: url,
        sent_count: sent,
        failed_count: failed,
      })
    }

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
