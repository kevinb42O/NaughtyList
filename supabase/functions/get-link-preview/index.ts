import { createClient } from 'npm:@supabase/supabase-js@2'
import * as cheerio from 'npm:cheerio'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' })
  }

  try {
    const body = await req.json()
    const targetUrl = body.url

    if (!targetUrl || typeof targetUrl !== 'string') {
      return jsonResponse({ error: 'Missing url parameter' })
    }

    try {
      new URL(targetUrl)
    } catch {
      return jsonResponse({ error: 'Invalid URL' })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      return jsonResponse({ error: `Failed to fetch URL: ${response.statusText}` })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      return jsonResponse({ error: 'URL does not return HTML' })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || ''
    let image = $('meta[property="og:image"]').attr('content') || ''
    const url = $('meta[property="og:url"]').attr('content') || targetUrl

    // Ensure image is an absolute URL
    if (image && !image.startsWith('http')) {
      if (image.startsWith('//')) {
        image = `https:${image}`
      } else {
        const origin = new URL(targetUrl).origin
        image = `${origin}${image.startsWith('/') ? '' : '/'}${image}`
      }
    }

    return jsonResponse({ title, description, image, url })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})
