// ============================================================
// CCG — RELIABLE CONTENT ANNOUNCEMENTS
// ------------------------------------------------------------
// Backwards-compatible endpoint name retained:
//   send-new-game-notification
//
// Supports games, Zzap!64/Retro Specials, Retro Events and
// Amiga Demo Music. Gateway JWT verification remains disabled;
// this function validates the bearer token and administrator role.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DUPLICATE_WINDOW_MINUTES = 10;
const SEND_CONCURRENCY = 3;
const ALLOWED_CONTENT_TYPES = new Set(["game", "retro_special", "retro_event", "demo_music"]);
const ALLOWED_MODES = new Set(["new_content", "featured_classic", "spotlight_pick"]);

type NotifyPayload = {
  mode?: string;
  content_name?: string;
  content_slug?: string;
  content_thumbnail?: string;
  content_url?: string;
  content_type?: string;
  content_category?: string;
  test_email?: boolean;
  notify_members?: boolean;
  game_name?: string;
  game_slug?: string;
  game_thumbnail?: string;
  game_url?: string;
};

type Recipient = {
  id: string;
  email: string;
  unsubscribeToken: string;
};

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeType(value: unknown): string {
  const type = text(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (type === "retro_specials") return "retro_special";
  if (type === "retro_events") return "retro_event";
  if (type === "amiga_demo_music") return "demo_music";
  return ALLOWED_CONTENT_TYPES.has(type) ? type : "game";
}

function normalizeMode(value: unknown): string {
  const mode = text(value).toLowerCase();
  if (mode === "new_game_added" || mode === "coming_soon" || mode === "coming_soon_members") {
    return "new_content";
  }
  return ALLOWED_MODES.has(mode) ? mode : "new_content";
}

function escapeHtml(value: unknown): string {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function contentTypeLabel(contentType: string, category: string): string {
  if (category === "zzap64") return "Zzap!64 feature";
  if (contentType === "retro_special") return "Retro Special";
  if (contentType === "retro_event") return "Retro Event";
  if (contentType === "demo_music") return "Amiga Demo Music video";
  return "game";
}

function subjectFor(mode: string, contentType: string, category: string, title: string): string {
  if (mode === "featured_classic") {
    return contentType === "game" ? `⭐ Featured Classic: ${title}` : `⭐ Featured CCG Video: ${title}`;
  }
  if (mode === "spotlight_pick") return `🎯 CCG Spotlight: ${title}`;
  if (category === "zzap64") return `🏅 New Zzap!64 Feature: ${title}`;
  if (contentType === "retro_special") return `🎬 New CCG Video: ${title}`;
  if (contentType === "retro_event") return `📅 New Retro Event: ${title}`;
  if (contentType === "demo_music") return `🎵 New Amiga Demo Music: ${title}`;
  return `🆕 New Game Added: ${title}`;
}

function resolveSiteUrl(rawValue: unknown, siteOrigin: string): string {
  const raw = text(rawValue);
  if (!raw) throw new Error("Invalid payload (missing content_url)");
  const url = new URL(raw, siteOrigin);
  if (url.origin !== siteOrigin) throw new Error("Content URL must remain on the CCG website");
  return url.toString();
}

function resolveThumbnail(rawValue: unknown, siteOrigin: string): string {
  const raw = text(rawValue);
  if (!raw) return "";

  try {
    const url = new URL(raw, siteOrigin);
    const allowedExternalHosts = new Set(["img.youtube.com", "i.ytimg.com"]);
    if (url.protocol !== "https:") return "";
    if (url.origin !== siteOrigin && !allowedExternalHosts.has(url.hostname.toLowerCase())) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function preferenceColumn(contentType: string): "notify_new_games" | "notify_newsletter" {
  return contentType === "game" ? "notify_new_games" : "notify_newsletter";
}

function buildEmailHtml(args: {
  title: string;
  contentType: string;
  category: string;
  contentUrl: string;
  thumbnail: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
  isTest: boolean;
}): string {
  const label = contentTypeLabel(args.contentType, args.category);
  const safeTitle = escapeHtml(args.title);
  const safeLabel = escapeHtml(label);
  const safeContentUrl = escapeHtml(args.contentUrl);
  const safePreferencesUrl = escapeHtml(args.preferencesUrl);
  const safeUnsubscribeUrl = escapeHtml(args.unsubscribeUrl);
  const image = args.thumbnail
    ? `<p style="margin:0 0 24px"><img src="${escapeHtml(args.thumbnail)}" alt="" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:8px"></p>`
    : "";
  const testNotice = args.isTest
    ? '<p style="padding:12px 14px;background:#f1f5f9;border-radius:6px"><strong>Test email:</strong> this was sent only to the administrator address.</p>'
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#080b18;color:#e8edf8;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:620px;margin:0 auto;padding:28px 18px">
    <div style="background:#11162b;border:1px solid #394263;border-radius:10px;padding:26px">
      <p style="margin:0 0 8px;color:#8fd8ff;font-size:14px;text-transform:uppercase;letter-spacing:.08em">Cheeky Commodore Gamer</p>
      <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#ffffff">${safeTitle}</h1>
      <p style="margin:0 0 22px;color:#c8d1e4;line-height:1.6">A new ${safeLabel} is now available on the CCG website.</p>
      ${image}
      <p style="margin:0 0 24px"><a href="${safeContentUrl}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#4fb7e7;color:#07111b;text-decoration:none;font-weight:bold">Open on CCG</a></p>
      ${testNotice}
      <hr style="border:0;border-top:1px solid #313a58;margin:26px 0">
      <p style="margin:0;color:#9da8bf;font-size:13px;line-height:1.6">Manage notification choices in <a href="${safePreferencesUrl}" style="color:#8fd8ff">Member Hub settings</a>.</p>
      <p style="margin:8px 0 0;color:#9da8bf;font-size:13px;line-height:1.6"><a href="${safeUnsubscribeUrl}" style="color:#8fd8ff">Stop these emails</a></p>
    </div>
  </div>
</body>
</html>`;
}

function buildPlainText(title: string, label: string, contentUrl: string, preferencesUrl: string): string {
  return `${title}\n\nA new ${label} is now available on Cheeky Commodore Gamer.\n\nOpen it: ${contentUrl}\n\nManage notification choices: ${preferencesUrl}`;
}

async function sendViaResend(args: {
  apiKey: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  plainText: string;
}): Promise<void> {
  const body: Record<string, unknown> = {
    from: args.from,
    to: [args.to],
    subject: args.subject,
    html: args.html,
    text: args.plainText,
  };
  if (args.replyTo) body.reply_to = args.replyTo;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function run(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

async function authEmailMap(serviceClient: any): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Recipient email lookup failed: ${error.message}`);
    const users = Array.isArray(data?.users) ? data.users : [];
    users.forEach((user) => {
      if (user.id && user.email && user.email_confirmed_at) result.set(user.id, user.email);
    });
    if (users.length < perPage) break;
  }

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const requestOrigin = text(req.headers.get("origin"));
  if (requestOrigin && requestOrigin !== ALLOWED_ORIGIN) {
    return json({ success: false, error: "Origin not allowed" }, 403);
  }

  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const anonKey = text(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const resendApiKey = text(Deno.env.get("RESEND_API_KEY"));
  const emailFrom = text(Deno.env.get("EMAIL_FROM"));
  const emailReplyTo = text(Deno.env.get("EMAIL_REPLY_TO"));
  const configuredSiteUrl = text(Deno.env.get("SITE_URL")) || ALLOWED_ORIGIN;

  if (!supabaseUrl || !anonKey || !serviceKey || !resendApiKey || !emailFrom) {
    return json({ success: false, error: "Announcement service is not fully configured" }, 500);
  }

  const siteOrigin = new URL(configuredSiteUrl).origin;
  if (siteOrigin !== ALLOWED_ORIGIN) {
    return json({ success: false, error: "SITE_URL must use the CCG production origin" }, 500);
  }

  const authHeader = text(req.headers.get("authorization"));
  const apikey = text(req.headers.get("apikey"));
  if (!apikey) return json({ success: false, error: "Missing apikey header" }, 401);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ success: false, error: "Missing bearer token" }, 401);
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: authHeader },
  });
  if (!authResponse.ok) return json({ success: false, error: "Invalid session" }, 401);

  const authUser = await authResponse.json().catch(() => null);
  const actorId = text(authUser?.id);
  const actorEmail = text(authUser?.email);
  if (!actorId || !actorEmail) return json({ success: false, error: "Invalid administrator account" }, 401);

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: actorProfile, error: actorError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();
  if (actorError) return json({ success: false, error: "Administrator profile lookup failed" }, 500);

  const role = text(actorProfile?.role).toLowerCase();
  if (!["admin", "superadmin", "editor"].includes(role)) {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  let payload: NotifyPayload;
  try {
    payload = (await req.json()) as NotifyPayload;
  } catch {
    return json({ success: false, error: "Invalid JSON payload" }, 400);
  }

  const contentType = normalizeType(payload.content_type);
  const category = text(payload.content_category).toLowerCase() === "zzap64" ? "zzap64" : contentType;
  const mode = normalizeMode(payload.mode);
  const title = text(payload.content_name || payload.game_name);
  const slug = text(payload.content_slug || payload.game_slug);
  const testEmail = payload.test_email === true;
  const notifyMembers = payload.notify_members === true;

  if (!title || !slug) return json({ success: false, error: "Content title and slug are required" }, 400);
  if (testEmail === notifyMembers) {
    return json({ success: false, error: "Choose exactly one recipient mode" }, 400);
  }
  if (notifyMembers && !["admin", "superadmin"].includes(role)) {
    return json({ success: false, error: "Only administrators can notify members" }, 403);
  }

  let contentUrl: string;
  try {
    contentUrl = resolveSiteUrl(payload.content_url || payload.game_url, siteOrigin);
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : "Invalid content URL" }, 400);
  }
  const thumbnail = resolveThumbnail(payload.content_thumbnail || payload.game_thumbnail, siteOrigin);
  const recipientScope = testEmail ? "test" : "members";
  const preference = preferenceColumn(contentType);
  const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60_000).toISOString();

  const { data: recent, error: recentError } = await serviceClient
    .from("content_announcements")
    .select("id, status, created_at")
    .eq("content_type", contentType)
    .eq("content_slug", slug)
    .eq("recipient_scope", recipientScope)
    .gte("created_at", duplicateSince)
    .in("status", ["processing", "sent", "partial"])
    .limit(1);

  if (recentError) {
    return json({ success: false, error: "Phase 20B database migration has not been applied" }, 503);
  }
  if (Array.isArray(recent) && recent.length) {
    return json({ success: false, error: "This announcement was already sent recently" }, 409);
  }

  const subject = subjectFor(mode, contentType, category, title);
  const { data: announcement, error: insertError } = await serviceClient
    .from("content_announcements")
    .insert({
      actor_user_id: actorId,
      content_type: contentType,
      content_category: category,
      content_slug: slug,
      content_title: title,
      content_url: contentUrl,
      mode,
      recipient_scope: recipientScope,
      preference_column: preference,
      status: "processing",
      subject,
    })
    .select("id")
    .single();

  if (insertError || !announcement?.id) {
    return json({ success: false, error: "Unable to create announcement log" }, 500);
  }

  const announcementId = announcement.id;

  try {
    let recipients: Recipient[] = [];

    if (testEmail) {
      recipients = [{ id: actorId, email: actorEmail, unsubscribeToken: "" }];
    } else {
      const { data: profileRows, error: profilesError } = await serviceClient
        .from("profiles")
        .select("id, notify_new_games, notify_newsletter, banned, unsub_token")
        .eq("banned", false)
        .eq(preference, true);

      if (profilesError) throw new Error(`Recipient preference query failed: ${profilesError.message}`);

      const emails = await authEmailMap(serviceClient);
      recipients = (Array.isArray(profileRows) ? profileRows : [])
        .map((profile) => ({
          id: text(profile.id),
          email: emails.get(text(profile.id)) || "",
          unsubscribeToken: text(profile.unsub_token),
        }))
        .filter((recipient) => recipient.id && recipient.email);
    }

    const preferencesUrl = `${siteOrigin}/community/profile.html#memberSettings`;
    const label = contentTypeLabel(contentType, category);

    const deliveries = await mapLimit(recipients, SEND_CONCURRENCY, async (recipient) => {
      const unsubscribeUrl = recipient.unsubscribeToken
        ? `${siteOrigin}/community/unsubscribe.html?token=${encodeURIComponent(recipient.unsubscribeToken)}`
        : preferencesUrl;
      const html = buildEmailHtml({
        title,
        contentType,
        category,
        contentUrl,
        thumbnail,
        preferencesUrl,
        unsubscribeUrl,
        isTest: testEmail,
      });
      const plainText = buildPlainText(title, label, contentUrl, preferencesUrl);

      try {
        await sendViaResend({
          apiKey: resendApiKey,
          from: emailFrom,
          replyTo: emailReplyTo,
          to: recipient.email,
          subject,
          html,
          plainText,
        });
        return { sent: true, error: "" };
      } catch (error) {
        return { sent: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    const attempted = recipients.length;
    const sent = deliveries.filter((delivery) => delivery.sent).length;
    const failed = attempted - sent;
    const firstError = deliveries.find((delivery) => !delivery.sent)?.error || "";
    const status = failed === 0 ? "sent" : sent > 0 ? "partial" : attempted === 0 ? "sent" : "failed";

    await serviceClient
      .from("content_announcements")
      .update({ attempted, sent, failed, status, error_detail: firstError || null, completed_at: new Date().toISOString() })
      .eq("id", announcementId);

    await serviceClient.from("admin_activity_log").insert({
      event_type: "content_announcement_sent",
      user_id: actorId,
      actor_user_id: actorId,
      email: actorEmail,
      metadata: {
        announcement_id: announcementId,
        content_type: contentType,
        content_category: category,
        content_slug: slug,
        recipient_scope: recipientScope,
        preference,
        attempted,
        sent,
        failed,
      },
    });

    if (failed > 0 && sent === 0 && attempted > 0) {
      return json({ success: false, error: "No announcement emails were delivered", attempted, sent, failed }, 502);
    }

    return json({ success: true, attempted, sent, failed, scope: recipientScope, preference });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await serviceClient
      .from("content_announcements")
      .update({ status: "failed", error_detail: message.slice(0, 1000), completed_at: new Date().toISOString() })
      .eq("id", announcementId);
    return json({ success: false, error: message }, 500);
  }
});
