import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_SITE_URL = "https://www.cheekycommodoregamer.co.uk";
const EMAIL_BANNER_PATH = "/resources/images/email/ccg-email-banner.png";
const EMAIL_BANNER_CID = "ccg-auth-banner";

type AuthUser = {
  email?: string;
  new_email?: string;
  user_metadata?: Record<string, unknown>;
};

type EmailData = {
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
  token_new?: string;
  token_hash_new?: string;
  old_email?: string;
  old_phone?: string;
  provider?: string;
  factor_type?: string;
};

type HookPayload = {
  user?: AuthUser;
  email_data?: EmailData;
};

type MailSpec = {
  to: string;
  subject: string;
  heading: string;
  intro: string;
  buttonLabel?: string;
  actionUrl?: string;
  code?: string;
  securityNote: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function escapeHtml(value: unknown): string {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailAddress(value: unknown): string {
  const raw = text(value);
  const bracketed = raw.match(/<([^<>]+)>/);
  const address = text(bracketed?.[1] || raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : "";
}

function brandedFrom(value: unknown): string {
  const address = emailAddress(value);
  return address ? `Cheeky Commodore Gamer <${address}>` : "";
}

function recipientName(user: AuthUser): string {
  const metadata = user.user_metadata || {};
  const preferred = text(
    metadata.display_name
    || metadata.username
    || metadata.name
    || ""
  );
  return preferred ? preferred.slice(0, 64) : "CCG gamer";
}

function verificationUrl(
  supabaseUrl: string,
  tokenHash: string,
  actionType: string,
  redirectTo: string
): string {
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", actionType);
  if (redirectTo) url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

function actionCopy(actionType: string): {
  subject: string;
  heading: string;
  intro: string;
  buttonLabel: string;
  securityNote: string;
} {
  switch (actionType) {
    case "signup":
      return {
        subject: "Confirm your Cheeky Commodore Gamer account 🕹️",
        heading: "WELCOME TO THE CCG MEMBER HUB",
        intro: "You’re one click away from finishing your Cheeky Commodore Gamer account. Confirm your email address and you’ll be ready to sign in.",
        buttonLabel: "CONFIRM MY CCG ACCOUNT",
        securityNote: "If you did not create a Cheeky Commodore Gamer account, you can safely ignore this email."
      };
    case "recovery":
      return {
        subject: "Reset your Cheeky Commodore Gamer password 🔐",
        heading: "RESET YOUR CCG PASSWORD",
        intro: "A password reset was requested for your Cheeky Commodore Gamer account.",
        buttonLabel: "RESET MY PASSWORD",
        securityNote: "If you did not request a password reset, ignore this email and your password will remain unchanged."
      };
    case "magiclink":
      return {
        subject: "Your Cheeky Commodore Gamer sign-in link 🕹️",
        heading: "YOUR CCG SIGN-IN LINK",
        intro: "Use the secure link below to sign in to your Cheeky Commodore Gamer account.",
        buttonLabel: "SIGN IN TO CCG",
        securityNote: "If you did not request this sign-in link, you can safely ignore this email."
      };
    case "invite":
      return {
        subject: "You’re invited to Cheeky Commodore Gamer 🕹️",
        heading: "YOU’RE INVITED",
        intro: "You’ve been invited to join the Cheeky Commodore Gamer Member Hub.",
        buttonLabel: "ACCEPT CCG INVITE",
        securityNote: "If you were not expecting this invitation, you can safely ignore this email."
      };
    case "email_change":
    case "email":
      return {
        subject: "Confirm your Cheeky Commodore Gamer email address",
        heading: "CONFIRM YOUR EMAIL CHANGE",
        intro: "Confirm this email address to complete the change on your Cheeky Commodore Gamer account.",
        buttonLabel: "CONFIRM EMAIL ADDRESS",
        securityNote: "If you did not request this change, do not click the button and contact CCG support."
      };
    case "reauthentication":
      return {
        subject: "Your CCG verification code",
        heading: "CCG SECURITY CHECK",
        intro: "Use the verification code below to confirm this sensitive account action.",
        buttonLabel: "",
        securityNote: "Never share this code with anyone. CCG will never ask you to send it back by email or message."
      };
    case "password_changed_notification":
      return {
        subject: "Your CCG password was changed",
        heading: "PASSWORD CHANGED",
        intro: "The password for your Cheeky Commodore Gamer account has just been changed.",
        buttonLabel: "",
        securityNote: "If this was not you, reset your password immediately and contact CCG support."
      };
    case "email_changed_notification":
      return {
        subject: "Your CCG email address was changed",
        heading: "EMAIL ADDRESS CHANGED",
        intro: "The email address on your Cheeky Commodore Gamer account has just been changed.",
        buttonLabel: "",
        securityNote: "If this was not you, contact CCG support immediately."
      };
    case "phone_changed_notification":
      return {
        subject: "Your CCG phone number was changed",
        heading: "PHONE NUMBER CHANGED",
        intro: "The phone number associated with your Cheeky Commodore Gamer account has just been changed.",
        buttonLabel: "",
        securityNote: "If this was not you, contact CCG support immediately."
      };
    case "identity_linked_notification":
      return {
        subject: "A sign-in method was linked to your CCG account",
        heading: "SIGN-IN METHOD ADDED",
        intro: "A new sign-in method was linked to your Cheeky Commodore Gamer account.",
        buttonLabel: "",
        securityNote: "If this was not you, review your account security immediately."
      };
    case "identity_unlinked_notification":
      return {
        subject: "A sign-in method was removed from your CCG account",
        heading: "SIGN-IN METHOD REMOVED",
        intro: "A sign-in method was removed from your Cheeky Commodore Gamer account.",
        buttonLabel: "",
        securityNote: "If this was not you, review your account security immediately."
      };
    case "mfa_factor_enrolled_notification":
      return {
        subject: "Verification was added to your CCG account",
        heading: "VERIFICATION METHOD ADDED",
        intro: "A new verification method was added to your Cheeky Commodore Gamer account.",
        buttonLabel: "",
        securityNote: "If this was not you, review your account security immediately."
      };
    case "mfa_factor_unenrolled_notification":
      return {
        subject: "Verification was removed from your CCG account",
        heading: "VERIFICATION METHOD REMOVED",
        intro: "A verification method was removed from your Cheeky Commodore Gamer account.",
        buttonLabel: "",
        securityNote: "If this was not you, review your account security immediately."
      };
    default:
      return {
        subject: "Cheeky Commodore Gamer account message",
        heading: "CCG ACCOUNT MESSAGE",
        intro: "There is an update relating to your Cheeky Commodore Gamer account.",
        buttonLabel: "",
        securityNote: "If you were not expecting this email, contact CCG support."
      };
  }
}

function renderHtml(spec: MailSpec, user: AuthUser, siteUrl: string): string {
  const name = escapeHtml(recipientName(user));
  const bannerUrl = `cid:${EMAIL_BANNER_CID}`;
  const safeActionUrl = escapeHtml(spec.actionUrl || "");
  const actionButton = spec.actionUrl && spec.buttonLabel
    ? `
      <tr>
        <td align="center" style="padding:4px 26px 28px">
          <a href="${safeActionUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#65c8ff;color:#06111f;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:18px;font-weight:800;text-decoration:none;letter-spacing:.4px">${escapeHtml(spec.buttonLabel)}</a>
        </td>
      </tr>`
    : "";

  const codeBlock = spec.code
    ? `
      <tr>
        <td align="center" style="padding:4px 26px 28px">
          <div style="display:inline-block;padding:14px 22px;border:1px solid #456b93;border-radius:8px;background:#101f33;color:#ffffff;font-family:Consolas,Monaco,monospace;font-size:25px;font-weight:800;letter-spacing:5px">${escapeHtml(spec.code)}</div>
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(spec.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#e9edf3;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(spec.subject)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#e9edf3">
    <tr>
      <td align="center" style="padding:22px 8px">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#071321;border:1px solid #294968;border-radius:10px;overflow:hidden">
          <tr>
            <td style="padding:0;background:#153d65">
              <a href="${escapeHtml(siteUrl)}" style="text-decoration:none">
                <img src="${bannerUrl}" width="640" alt="Cheeky Commodore Gamer" style="display:block;width:100%;max-width:640px;height:auto;border:0">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:27px 28px 12px">
              <p style="margin:0 0 16px;color:#dce8f5;font-size:16px;line-height:1.55">Hello ${name},</p>
              <h1 style="margin:0 0 14px;color:#ffffff;font-size:24px;line-height:1.28;font-weight:800;letter-spacing:.3px">${escapeHtml(spec.heading)}</h1>
              <p style="margin:0;color:#c8d6e6;font-size:16px;line-height:1.6">${escapeHtml(spec.intro)}</p>
            </td>
          </tr>
          ${actionButton}
          ${codeBlock}
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #21384f;background:#0a1726">
              <p style="margin:0 0 7px;color:#9fb2c7;font-size:13px;line-height:1.55">${escapeHtml(spec.securityNote)}</p>
              <p style="margin:0;color:#9fb2c7;font-size:13px;line-height:1.55">
                Need help? <a href="${escapeHtml(siteUrl)}/contact.html" style="color:#78cef7;text-decoration:underline">Contact Cheeky Commodore Gamer</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #21384f;color:#8297ad;font-size:12px;line-height:1.55">
              <p style="margin:0 0 6px">Cheeky Commodore Gamer · Commodore 64 &amp; Amiga gaming</p>
              <p style="margin:0"><a href="${escapeHtml(siteUrl)}" style="color:#78cef7;text-decoration:none">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(spec: MailSpec, user: AuthUser, siteUrl: string): string {
  const lines = [
    spec.heading,
    "",
    `Hello ${recipientName(user)},`,
    "",
    spec.intro,
    ""
  ];

  if (spec.actionUrl && spec.buttonLabel) {
    lines.push(`${spec.buttonLabel}: ${spec.actionUrl}`, "");
  }
  if (spec.code) {
    lines.push(`Verification code: ${spec.code}`, "");
  }

  lines.push(
    spec.securityNote,
    "",
    `Cheeky Commodore Gamer: ${siteUrl}`,
    `Support: ${siteUrl}/contact.html`
  );

  return lines.join("\n");
}

async function sendMail(
  apiKey: string,
  from: string,
  replyTo: string,
  spec: MailSpec,
  user: AuthUser,
  siteUrl: string
): Promise<void> {
  const body: Record<string, unknown> = {
    from,
    to: [spec.to],
    subject: spec.subject,
    html: renderHtml(spec, user, siteUrl),
    text: renderText(spec, user, siteUrl),
    attachments: [
      {
        path: `${siteUrl}${EMAIL_BANNER_PATH}`,
        filename: "ccg-email-banner.png",
        content_id: EMAIL_BANNER_CID
      }
    ]
  };

  if (replyTo) body.reply_to = replyTo;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

function buildSpecs(payload: HookPayload, supabaseUrl: string, siteUrl: string): MailSpec[] {
  const user = payload.user || {};
  const email = payload.email_data || {};
  const actionType = text(email.email_action_type);
  const copy = actionCopy(actionType);
  const currentEmail = emailAddress(user.email);
  const newEmail = emailAddress(user.new_email);
  const redirectTo = text(email.redirect_to) || siteUrl;
  const token = text(email.token);
  const tokenHash = text(email.token_hash);
  const tokenNew = text(email.token_new);
  const tokenHashNew = text(email.token_hash_new);

  if (!currentEmail && !newEmail) throw new Error("Auth hook payload has no valid recipient email");

  if (actionType === "email_change" && newEmail) {
    const specs: MailSpec[] = [];

    if (currentEmail && tokenHashNew) {
      specs.push({
        to: currentEmail,
        subject: copy.subject,
        heading: copy.heading,
        intro: "Confirm the requested email-address change for your Cheeky Commodore Gamer account.",
        buttonLabel: copy.buttonLabel,
        actionUrl: verificationUrl(supabaseUrl, tokenHashNew, actionType, redirectTo),
        securityNote: copy.securityNote
      });
    }

    if (tokenHash) {
      specs.push({
        to: newEmail,
        subject: copy.subject,
        heading: copy.heading,
        intro: "Confirm this new email address to complete the change on your Cheeky Commodore Gamer account.",
        buttonLabel: copy.buttonLabel,
        actionUrl: verificationUrl(supabaseUrl, tokenHash, actionType, redirectTo),
        securityNote: copy.securityNote
      });
    }

    if (specs.length) return specs;
  }

  const recipient = newEmail || currentEmail;
  const isNotification = actionType.endsWith("_notification");
  const isCodeOnly = actionType === "reauthentication";

  return [{
    to: recipient,
    subject: copy.subject,
    heading: copy.heading,
    intro: copy.intro,
    buttonLabel: isNotification || isCodeOnly ? "" : copy.buttonLabel,
    actionUrl: isNotification || isCodeOnly || !tokenHash
      ? ""
      : verificationUrl(supabaseUrl, tokenHash, actionType, redirectTo),
    code: isCodeOnly ? (tokenNew || token) : "",
    securityNote: copy.securityNote
  }];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { http_code: 405, message: "Method not allowed" } }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const resendApiKey = text(Deno.env.get("RESEND_API_KEY"));
  const rawFrom = Deno.env.get("AUTH_EMAIL_FROM") || Deno.env.get("EMAIL_FROM");
  const from = brandedFrom(rawFrom);
  const replyTo = emailAddress(Deno.env.get("EMAIL_REPLY_TO"));
  const hookSecretRaw = text(
    Deno.env.get("SEND_EMAIL_HOOK_SECRETS")
    || Deno.env.get("SEND_EMAIL_HOOK_SECRET")
  );
  const hookSecret = hookSecretRaw.replace(/^v1,whsec_/, "");
  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const siteUrl = (text(Deno.env.get("SITE_URL")) || DEFAULT_SITE_URL).replace(/\/$/, "");

  if (!resendApiKey || !from || !hookSecret || !supabaseUrl) {
    return new Response(JSON.stringify({
      error: {
        http_code: 500,
        message: "CCG auth email service is not fully configured"
      }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const rawPayload = await req.text();

  try {
    const headers = Object.fromEntries(req.headers);
    const verifier = new Webhook(hookSecret);
    const payload = verifier.verify(rawPayload, headers) as HookPayload;

    const specs = buildSpecs(payload, supabaseUrl, siteUrl);
    for (const spec of specs) {
      await sendMail(resendApiKey, from, replyTo, spec, payload.user || {}, siteUrl);
    }

    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CCG-AUTH-EMAIL]", message);
    return new Response(JSON.stringify({
      error: {
        http_code: 500,
        message: "Unable to send CCG authentication email"
      }
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "true"
      }
    });
  }
});
