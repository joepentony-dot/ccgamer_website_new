// ============================================================
// CCG — Send New Game Notification (Option A + Test Email)
// Edge Function (JWT verification OFF)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------
// Environment
// ---------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SITE_URL =
  (Deno.env.get('SITE_URL') || 'https://www.cheekycommodoregamer.co.uk').replace(/\/$/, '')

// Admin test recipient (locked)
const ADMIN_TEST_EMAIL = 'joepentony@hotmail.com'

// ---------------------------
// CORS
// ---------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// ---------------------------
// Types
// ---------------------------
interface Payload {
  game_name: string
  mode: 'coming_soon'
  test_email?: boolean
}

// ---------------------------
// Helpers
// ---------------------------
function comingSoonEmail(gameName: string) {
  const gameUrl = `${SITE_URL}/games/`

  return {
    subject: `Coming Soon on CCG: ${gameName}`,
    html: `
      <p><strong>${gameName}</strong> has just been created on the Cheeky Commodore Gamer website.</p>

      <p>The full game page will be added shortly.</p>

      <p>
        👉 <a href="${gameUrl}">Visit the website</a><br>
        👉 <a href="${SITE_URL}/quiz/">Try the quizzes</a><br>
        👉 <a href="https://www.youtube.com/@CheekyCommodoreGamer">Subscribe on YouTube</a><br>
        👉 <a href="https://discord.gg/">Join the Discord</a>
      </p>

      <p>Thank you for your continued support.<br>
      <strong>Stay Retro 🕹️</strong></p>
    `
  }
}

// ============================================================
// Handler
// ============================================================
Deno.serve(async (req) => {
  // ---- Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as Payload
    const { game_name, mode, test_email } = payload

    if (!game_name || mode !== 'coming_soon') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const email = comingSoonEmail(game_name)

    // ========================================================
    // ADMIN TEST EMAIL (ONLY ONE EMAIL, NO MEMBERS)
    // ========================================================
    if (test_email === true) {
      await supabase.from('email_outbox').insert({
        to_email: ADMIN_TEST_EMAIL,
        subject: `[TEST] ${email.subject}`,
        html: email.html,
        purpose: 'new_game_test',
        status: 'queued'
      })

      console.info('[CCG] Test email queued for admin')

      return new Response(
        JSON.stringify({ ok: true, test: true }),
        { headers: corsHeaders }
      )
    }

    // ========================================================
    // REAL MEMBER NOTIFICATION (OPT-IN ONLY)
    // ========================================================
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('email')
      .eq('notify_new_games', true)
      .not('email', 'is', null)

    if (usersError) {
      throw usersError
    }

    let queued = 0

    for (const user of users ?? []) {
      await supabase.from('email_outbox').insert({
        to_email: user.email,
        subject: email.subject,
        html: email.html,
        purpose: 'new_game_coming_soon',
        status: 'queued'
      })

      queued++
    }

    console.info(`[CCG] Coming Soon notifications queued: ${queued}`)

    return new Response(
      JSON.stringify({ ok: true, queued }),
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('[CCG] Function error:', err)

    return new Response(
      JSON.stringify({ ok: false, error: 'Internal Server Error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})