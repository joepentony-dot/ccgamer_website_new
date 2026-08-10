// CCG Phase 20D — secure announcement delivery handler.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  brandedFrom,
  buildBrandedAttachments,
  buildBrandedEmailHtml,
  buildBrandedPlainText,
} from "./email-template.ts";

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

type InlineAttachment = {
  path: string;
  filename: string;
  content_id: string;
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

function replyAddress(value: unknown): string {
  const raw = text(value);
  const bracketed = raw.match(/<([^<>]+)>/);
  const address = text(bracketed?.[1] || raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : "";
}

async function sendViaResend(args: {
  apiKey: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  plainText: string;
  attachments: InlineAttachment[];
}): Promise<void> {
  const body: Record<string, unknown> = {
    from: args.from,
    to: [args.to],
    subject: args.subject,
    html: args.html,
    text: args.plainText,
  };
  if (args.replyTo) body.reply_to = args.replyTo;
  if (args.attachments.length) body.attachments = args.attachments;

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
    users.forEach((user: { id?: string; email?: string; email_confirmed_at?: string | null }) => {
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
  const emailFrom = brandedFrom(Deno.env.get("EMAIL_FROM"));
  const emailReplyTo = replyAddress(Deno.env.get("EMAIL_REPLY_TO"));
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
  if (notifyMembers) {
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

      const brandedArgs = {
        title,
        contentType,
        category,
        mode,
        contentUrl,
        thumbnail,
        preferencesUrl,
        unsubscribeUrl,
        siteOrigin,
        recipientEmail: recipient.email,
        subject,
        isTest: testEmail,
      };

      try {
        await sendViaResend({
          apiKey: resendApiKey,
          from: emailFrom,
          replyTo: emailReplyTo,
          to: recipient.email,
          subject,
          html: buildBrandedEmailHtml(brandedArgs),
          plainText: buildBrandedPlainText(brandedArgs),
          attachments: buildBrandedAttachments(brandedArgs),
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
      .update({
        attempted,
        sent,
        failed,
        status,
        error_detail: firstError || null,
        completed_at: new Date().toISOString(),
      })
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
        email_template: "compact-banner-v3",
      },
    });

    if (failed > 0 && sent === 0 && attempted > 0) {
      return json({ success: false, error: "No announcement emails were delivered", attempted, sent, failed }, 502);
    }

    return json({
      success: true,
      attempted,
      sent,
      failed,
      scope: recipientScope,
      preference,
      sender: "CCG",
      template: "compact-banner-v3",
      label,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await serviceClient
      .from("content_announcements")
      .update({
        status: "failed",
        error_detail: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", announcementId);
    return json({ success: false, error: message }, 500);
  }
});
