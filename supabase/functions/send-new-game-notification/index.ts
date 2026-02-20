import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type NotifyPayload = {
  mode?: 'coming_soon'
  game_name?: string
  game_slug?: string
  test_email?: boolean
}

type Recipient = {
  email: string | null
  display_name: string | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://www.cheekycommodoregamer.co.uk').replace(/\/+$/, '')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || ''
const YOUTUBE_URL = Deno.env.get('YOUTUBE_URL') || ''
const DISCORD_URL = Deno.env.get('DISCORD_URL') || ''
const TEST_EMAIL = Deno.env.get('TEST_EMAIL') || 'joepentony@hotmail.com'

const allowedOrigins = new Set([
  'https://www.cheekycommodoregamer.co.uk',
  'http://localhost:5173',
  'http://localhost:3000'
])

function resolveCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowOrigin = allowedOrigins.has(origin)
    ? origin
    : 'https://www.cheekycommodoregamer.co.uk'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  }
}

function jsonResponse(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...resolveCorsHeaders(req),
      'Content-Type': 'application/json'
    }
  })
}

function extractBearerToken(req: Request) {
  const auth = req.headers.get('Authorization') || req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : ''
}

function buildMessage(payload: Required<Pick<NotifyPayload, 'game_name'>> & Pick<NotifyPayload, 'game_slug'>, displayName?: string | null) {
  const gamePath = payload.game_slug ? `/games/${payload.game_slug}/` : '/games/'
  const gameUrl = `${SITE_URL}${gamePath}`

  const safeDisplayName = String(displayName || '').trim() || 'Player'
  const subject = `CCG Coming Soon: ${payload.game_name}`
  const text = `Hi ${safeDisplayName},

${payload.game_name} has been created on the Cheeky Commodore Gamer website and will be added shortly:
${gameUrl}

Thanks for your continued support.
Stay Retro.

Helpful links:
Homepage: ${SITE_URL}/home.html
Try the quizzes: ${SITE_URL}/quiz/
YouTube: ${YOUTUBE_URL}
Discord: ${DISCORD_URL}
`

  return { subject, text }
}

async function sendEmailViaResend(to: string, subject: string, text: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      text
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      error: String((data as { message?: string }).message || `Resend request failed (${response.status})`)
    }
  }

  return { ok: true, id: (data as { id?: string }).id || null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: resolveCorsHeaders(req)
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { ok: false, error: 'Method not allowed. Use POST.' })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(req, 500, {
        ok: false,
        error: 'Supabase environment variables are not configured correctly.'
      })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return jsonResponse(req, 401, { ok: false, error: 'Missing Authorization Bearer token.' })
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: userData, error: userError } = await authClient.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse(req, 401, { ok: false, error: 'Invalid or expired access token.' })
    }

    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profileError) {
      return jsonResponse(req, 500, { ok: false, error: `Unable to verify role: ${profileError.message}` })
    }

    const role = String(profile?.role || '').toLowerCase()
    const allowedRoles = new Set(['admin', 'superadmin', 'editor'])
    if (!allowedRoles.has(role)) {
      return jsonResponse(req, 403, { ok: false, error: 'Admin/editor role required.' })
    }

    const body = (await req.json().catch(() => null)) as NotifyPayload | null
    if (!body) {
      return jsonResponse(req, 400, { ok: false, error: 'Invalid JSON payload.' })
    }

    const mode = body.mode
    const gameName = String(body.game_name || '').trim()
    const gameSlug = String(body.game_slug || '').trim()
    const testEmail = Boolean(body.test_email)

    if (mode !== 'coming_soon') {
      return jsonResponse(req, 400, { ok: false, error: 'Invalid mode. Expected coming_soon.' })
    }

    if (!gameName) {
      return jsonResponse(req, 400, { ok: false, error: 'game_name is required.' })
    }

    if (!RESEND_API_KEY || !FROM_EMAIL) {
      return jsonResponse(req, 200, {
        ok: false,
        error: 'Email not configured: set RESEND_API_KEY and FROM_EMAIL.',
        recipients_found: 0,
        attempted: 0,
        sent: 0,
        failed: 0
      })
    }

    let recipients: Recipient[] = []

    if (testEmail) {
      recipients = [{ email: TEST_EMAIL, display_name: 'Admin' }]
    } else {
      const { data: profiles, error: recipientsError } = await serviceClient
        .from('profiles')
        .select('email, display_name')
        .eq('notify_new_games', true)
        .not('email', 'is', null)

      if (recipientsError) {
        return jsonResponse(req, 500, { ok: false, error: `Unable to load recipients: ${recipientsError.message}` })
      }

      recipients = (profiles || []).filter((entry) => String(entry.email || '').trim())
    }

    const recipientsFound = recipients.length
    let attempted = 0
    let sent = 0
    let failed = 0
    const failures: Array<{ email: string; error: string }> = []

    for (const recipient of recipients) {
      const email = String(recipient.email || '').trim()
      if (!email) continue

      attempted += 1
      const content = buildMessage({ game_name: gameName, game_slug: gameSlug || undefined }, recipient.display_name)
      const sendResult = await sendEmailViaResend(email, content.subject, content.text)

      if (sendResult.ok) {
        sent += 1
      } else {
        failed += 1
        failures.push({ email, error: sendResult.error || 'Unknown resend error' })
      }
    }

    console.info(
      '[send-new-game-notification] counts',
      JSON.stringify({ recipients_found: recipientsFound, attempted, sent, failed, test_email: testEmail })
    )

    return jsonResponse(req, 200, {
      ok: failed === 0,
      success: failed === 0,
      mode: 'coming_soon',
      test_email: testEmail,
      recipients_found: recipientsFound,
      attempted,
      sent,
      failed,
      failures
    })
  } catch (error) {
    console.error('[send-new-game-notification] unexpected error', error)
    return jsonResponse(req, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    })
  }
})
