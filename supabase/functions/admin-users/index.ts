import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
}

async function getRequestUser(supabase: ReturnType<typeof createClient>, req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('You must be logged in to manage accounts')

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error('Invalid admin session')

  return data.user
}

async function requireAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (data?.role !== 'admin') throw new Error('Only admins can manage accounts')
}

function assertUuid(value: unknown) {
  if (typeof value !== 'string') throw new Error('targetUserId is required')

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(value)) throw new Error('targetUserId must be a valid user id')

  return value
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
    const { type, targetUserId } = await req.json()
    if (type !== 'delete-account') throw new Error('Unsupported admin user action')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const requestUser = await getRequestUser(supabase, req)
    await requireAdmin(supabase, requestUser.id)

    const targetId = assertUuid(targetUserId)
    if (targetId === requestUser.id) throw new Error('You cannot delete your own admin account')

    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', targetId)
      .maybeSingle()

    if (profileError) throw profileError
    if (!targetProfile) throw new Error('Profile not found')
    if (targetProfile.role === 'admin') throw new Error('The admin account is locked')

    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetId)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ deleted: true, profile: targetProfile }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
