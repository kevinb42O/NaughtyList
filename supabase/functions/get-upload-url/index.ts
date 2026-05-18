import { createClient } from 'npm:@supabase/supabase-js@2'
import { PutObjectCommand, S3Client } from 'npm:@aws-sdk/client-s3@3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID') ?? ''
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!
const R2_BUCKET = Deno.env.get('R2_BUCKET')!
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')!
const R2_ENDPOINT = Deno.env.get('R2_ENDPOINT') || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_UPLOADS_PER_HOUR = 20
const SIGNED_URL_TTL_SECONDS = 120

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

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

function requireString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

async function getRequestUser(supabase: ReturnType<typeof createClient>, req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('You must be logged in to upload images.')

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error('Invalid upload session.')

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
    const missingConfig = [
      ['SUPABASE_URL', SUPABASE_URL],
      ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
      ['R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID],
      ['R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY],
      ['R2_BUCKET', R2_BUCKET],
      ['R2_PUBLIC_URL', R2_PUBLIC_URL],
      ['R2_ENDPOINT or R2_ACCOUNT_ID', R2_ENDPOINT],
    ].find(([, value]) => !value)

    if (missingConfig) {
      return jsonResponse({ error: `Missing server media config: ${missingConfig[0]}` }, 500)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const user = await getRequestUser(supabase, req)
    const body = await req.json()
    const contentType = requireString(body.contentType).toLowerCase()
    const fileSize = Number(body.fileSize ?? 0)
    const extension = allowedTypes.get(contentType)

    if (!extension) {
      return jsonResponse({ error: 'Only JPEG, PNG, WebP, and GIF images can be uploaded.' }, 400)
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return jsonResponse({ error: 'Images must be 10 MB or smaller.' }, 400)
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('media_upload_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgo)

    if (countError) throw countError
    if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
      return jsonResponse({ error: 'Image upload limit reached. Try again in a bit.' }, 429)
    }

    const dateKey = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const objectKey = `${user.id}/${dateKey}/${crypto.randomUUID()}.${extension}`
    const s3 = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: fileSize,
    })
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: SIGNED_URL_TTL_SECONDS })
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`

    const { error: insertError } = await supabase.from('media_upload_events').insert({
      user_id: user.id,
      object_key: objectKey,
      content_type: contentType,
      file_size: fileSize,
    })

    if (insertError) throw insertError

    return jsonResponse({ uploadUrl, publicUrl, objectKey, expiresIn: SIGNED_URL_TTL_SECONDS })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to prepare image upload.' }, 400)
  }
})