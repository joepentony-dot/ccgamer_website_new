import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGINS = new Set([
  "https://www.cheekycommodoregamer.co.uk",
  "https://cheekycommodoregamer.co.uk"
]);
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DESTINATION = "info@cheekycommodoregamer.co.uk";
const VALID_STATUSES = new Set(["open", "replied", "closed"]);

function originFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "https://www.cheekycommodoregamer.co.uk";
}

function cors(req: Request) {
  return {
    "Access-Control-Allow-Origin": originFor(req),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" }
  });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseFeedbackId(value: unknown) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { success: false, error: "Method not allowed" }, 405);

  const requestOrigin = text(req.headers.get("origin"));
  if (requestOrigin && !ALLOWED_ORIGINS.has(requestOrigin)) {
    return json(req, { success: false, error: "Origin not allowed" }, 403);
  }

  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!supabaseUrl || !serviceKey) {
    return json(req, { success: false, error: "Admin feedback service is not configured" }, 500);
  }

  const authHeader = text(req.headers.get("authorization"));
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token) return json(req, { success: false, error: "Authentication required" }, 401);

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await service.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) return json(req, { success: false, error: "Invalid admin session" }, 401);

  const { data: roleRow, error: roleError } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const role = text(roleRow?.role).toLowerCase();
  if (roleError || !["admin", "superadmin"].includes(role)) {
    return json(req, { success: false, error: "Admin access required" }, 403);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json(req, { success: false, error: "Invalid JSON" }, 400);
  }

  const action = text(payload.action).toLowerCase();
  const feedbackId = parseFeedbackId(payload.feedback_id);
  if (!feedbackId) return json(req, { success: false, error: "A valid feedback ID is required" }, 400);

  if (action === "set_status") {
    const feedbackStatus = text(payload.status).toLowerCase();
    if (!VALID_STATUSES.has(feedbackStatus)) {
      return json(req, { success: false, error: "Invalid feedback status" }, 400);
    }

    const { data, error } = await service
      .from("game_feedback")
      .update({ feedback_status: feedbackStatus })
      .eq("id", feedbackId)
      .eq("game_slug", "the-lost-sizzler")
      .select("id,feedback_status")
      .maybeSingle();

    if (error) return json(req, { success: false, error: "Feedback status could not be updated" }, 500);
    if (!data) return json(req, { success: false, error: "Feedback report not found" }, 404);
    return json(req, { success: true, feedback: data });
  }

  if (action !== "reply") {
    return json(req, { success: false, error: "Unknown admin feedback action" }, 400);
  }

  const replyText = text(payload.reply_text);
  if (replyText.length < 2 || replyText.length > 4000) {
    return json(req, { success: false, error: "Reply must be between 2 and 4000 characters" }, 400);
  }

  const { data: feedback, error: feedbackError } = await service
    .from("game_feedback")
    .select("id,feedback_type,message,contact_email")
    .eq("id", feedbackId)
    .eq("game_slug", "the-lost-sizzler")
    .maybeSingle();

  if (feedbackError) return json(req, { success: false, error: "Feedback report could not be loaded" }, 500);
  if (!feedback) return json(req, { success: false, error: "Feedback report not found" }, 404);

  const recipientEmail = text(feedback.contact_email);
  if (!validEmail(recipientEmail)) {
    return json(req, { success: false, error: "This report has no valid contact email to reply to" }, 400);
  }

  const { data: replyRow, error: replyInsertError } = await service
    .from("game_feedback_replies")
    .insert({
      feedback_id: feedbackId,
      admin_user_id: user.id,
      reply_text: replyText,
      recipient_email: recipientEmail,
      email_status: "pending"
    })
    .select("id")
    .single();

  if (replyInsertError || !replyRow?.id) {
    return json(req, { success: false, error: "Reply could not be recorded" }, 500);
  }

  const resendKey = text(Deno.env.get("RESEND_API_KEY"));
  const rawFrom = text(Deno.env.get("EMAIL_FROM"));
  const bracketed = rawFrom.match(/<([^<>]+)>/);
  const fromAddress = text(bracketed?.[1] || rawFrom);
  const from = validEmail(fromAddress) ? `CCG <${fromAddress}>` : "";

  if (!resendKey || !from) {
    const emailError = "RESEND_API_KEY or EMAIL_FROM missing";
    await service.from("game_feedback_replies").update({ email_status: "failed", email_error: emailError }).eq("id", replyRow.id);
    return json(req, { success: false, error: "Reply email service is not configured" }, 500);
  }

  const typeLabel = text(feedback.feedback_type).toLowerCase() === "suggestion" ? "Game suggestion" : "Bug report";
  const subject = `Re: [The Lost Sizzler] ${typeLabel} #${feedbackId}`;
  const safeReply = escapeHtml(replyText).replace(/\n/g, "<br>");
  const safeOriginal = escapeHtml(text(feedback.message)).replace(/\n/g, "<br>");
  const replyTo = text(Deno.env.get("EMAIL_REPLY_TO")) || DESTINATION;

  const emailBody: Record<string, unknown> = {
    from,
    to: [recipientEmail],
    subject,
    html: `<h2>${escapeHtml(subject)}</h2><p>${safeReply}</p><hr><p><strong>Your original message:</strong></p><p>${safeOriginal}</p><p style="color:#666">You can reply to this email if you need to add anything else.</p>`,
    text: `${subject}\n\n${replyText}\n\nYour original message:\n${text(feedback.message)}\n\nYou can reply to this email if you need to add anything else.`
  };
  if (validEmail(replyTo)) emailBody.reply_to = replyTo;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailBody)
    });

    if (!response.ok) {
      throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }

    const now = new Date().toISOString();
    await service.from("game_feedback_replies").update({ email_status: "sent", email_error: null }).eq("id", replyRow.id);
    await service.from("game_feedback").update({ feedback_status: "replied", last_replied_at: now }).eq("id", feedbackId);

    return json(req, { success: true, reply_id: replyRow.id, email_status: "sent" });
  } catch (error) {
    const emailError = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
    await service.from("game_feedback_replies").update({ email_status: "failed", email_error: emailError }).eq("id", replyRow.id);
    return json(req, { success: false, error: "Reply was recorded but the email could not be sent", reply_id: replyRow.id }, 502);
  }
});
