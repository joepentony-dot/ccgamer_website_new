// CCG Phase 20D — compact announcement email presentation.
// Delivery, recipient consent, authentication and audit logging remain in handler.ts.

const PAYPAL_URL = "https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL";

export const EMAIL_BANNER_PATH = "/resources/images/email/ccg-email-banner.png";
export const EMAIL_BANNER_CID = "ccg-email-banner";
export const EMAIL_CONTENT_CID = "ccg-content-image";

export type EmailInlineAttachment = {
  path: string;
  filename: string;
  content_id: string;
};

export type BrandedEmailArgs = {
  title: string;
  contentType: string;
  category: string;
  mode: string;
  contentUrl: string;
  thumbnail: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
  siteOrigin: string;
  recipientEmail: string;
  subject: string;
  isTest: boolean;
};

type Presentation = {
  emoji: string;
  heading: string;
  intro: string;
  cta: string;
  shareLabel: string;
  archiveLabel: string;
  archiveCopy: string;
  archiveUrl: string;
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

function recipientName(email: string): string {
  const local = text(email).split("@")[0] || "";
  const readable = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return readable || "CCG member";
}

export function brandedFrom(value: unknown): string {
  const raw = text(value);
  const bracketed = raw.match(/<([^<>]+)>/);
  const address = text(bracketed?.[1] || raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? `CCG <${address}>` : "";
}

function presentationFor(args: BrandedEmailArgs): Presentation {
  const featured = args.mode === "featured_classic";
  const spotlight = args.mode === "spotlight_pick";

  if (args.category === "zzap64") {
    return {
      emoji: featured ? "⭐" : spotlight ? "🎯" : "🏅",
      heading: featured ? "Featured Zzap!64 Video" : spotlight ? "CCG Zzap!64 Spotlight" : "New Zzap!64 Feature",
      intro: "A new Zzap!64 feature has just gone live, covering the magazine, its awards and the Commodore games reviewed at the time.",
      cta: "Watch the Zzap!64 Feature",
      shareLabel: "Share this Zzap!64 feature",
      archiveLabel: "More Zzap!64 features",
      archiveCopy: "Continue through the CCG magazine archive for more Zzap!64 awards, reviews and Commodore retrospectives.",
      archiveUrl: `${args.siteOrigin}/retro-specials/`,
    };
  }

  if (args.contentType === "retro_special") {
    return {
      emoji: featured ? "⭐" : spotlight ? "🎯" : "🎬",
      heading: featured ? "Featured CCG Video" : spotlight ? "CCG Video Spotlight" : "New CCG Video",
      intro: "A new Cheeky Commodore Gamer video is now live, with another detailed look back at Commodore gaming.",
      cta: "Watch the Video",
      shareLabel: "Share this video",
      archiveLabel: "More CCG Retro Specials",
      archiveCopy: "Browse more long-form CCG videos, countdowns and Commodore features.",
      archiveUrl: `${args.siteOrigin}/retro-specials/`,
    };
  }

  if (args.contentType === "retro_event") {
    return {
      emoji: featured ? "⭐" : spotlight ? "🎯" : "📅",
      heading: featured ? "Featured Retro Event" : spotlight ? "Retro Event Spotlight" : "New Retro Event",
      intro: "A new retro event has been added to the CCG website, with the available details gathered in one place.",
      cta: "View the Event",
      shareLabel: "Share this event",
      archiveLabel: "Browse Retro Events",
      archiveCopy: "See more retro gaming events and community dates in the CCG archive.",
      archiveUrl: `${args.siteOrigin}/retro-events/`,
    };
  }

  if (args.contentType === "demo_music") {
    return {
      emoji: featured ? "⭐" : spotlight ? "🎯" : "🎵",
      heading: featured ? "Featured Amiga Video" : spotlight ? "Amiga Music Spotlight" : "New Amiga Demo Music",
      intro: "A new Amiga demo music video is now available on CCG, preserving another part of the machine's audio history.",
      cta: "Watch the Amiga Video",
      shareLabel: "Share this Amiga video",
      archiveLabel: "More Amiga Demo Music",
      archiveCopy: "Continue through the Amiga demo music collection for more classic scene audio.",
      archiveUrl: `${args.siteOrigin}/amiga-demo-music/`,
    };
  }

  return {
    emoji: featured ? "⭐" : spotlight ? "🎯" : "🆕",
    heading: featured ? "Featured Classic" : spotlight ? "CCG Game Spotlight" : "New Game Added",
    intro: "A new game has just gone live in the Cheeky Commodore Gamer archive.",
    cta: "View Game Page",
    shareLabel: "Share this game",
    archiveLabel: "Explore more Commodore games",
    archiveCopy: "Browse the CCG game archive by title, system, year, genre and publisher.",
    archiveUrl: `${args.siteOrigin}/games/`,
  };
}

function shareUrl(network: string, contentUrl: string, subject: string): string {
  const url = encodeURIComponent(contentUrl);
  const copy = encodeURIComponent(subject);

  if (network === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  if (network === "x") return `https://twitter.com/intent/tweet?url=${url}&text=${copy}`;
  if (network === "whatsapp") return `https://api.whatsapp.com/send?text=${copy}%20${url}`;
  if (network === "reddit") return `https://www.reddit.com/submit?url=${url}&title=${copy}`;
  return `https://t.me/share/url?url=${url}&text=${copy}`;
}

function shareButton(label: string, symbol: string, url: string, background: string): string {
  return `<a href="${escapeHtml(url)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" style="display:inline-block;width:38px;height:38px;line-height:38px;margin:0 8px 8px 0;border-radius:50%;background:${background};color:#ffffff;text-align:center;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700">${escapeHtml(symbol)}</a>`;
}

export function buildBrandedAttachments(args: BrandedEmailArgs): EmailInlineAttachment[] {
  const attachments: EmailInlineAttachment[] = [
    {
      path: `${args.siteOrigin}${EMAIL_BANNER_PATH}`,
      filename: "ccg-email-banner.png",
      content_id: EMAIL_BANNER_CID,
    },
  ];

  if (args.thumbnail) {
    attachments.push({
      path: args.thumbnail,
      filename: "ccg-content-thumbnail.jpg",
      content_id: EMAIL_CONTENT_CID,
    });
  }

  return attachments;
}

export function buildBrandedEmailHtml(args: BrandedEmailArgs): string {
  const presentation = presentationFor(args);
  const safeTitle = escapeHtml(args.title);
  const safeContentUrl = escapeHtml(args.contentUrl);
  const safePreferencesUrl = escapeHtml(args.preferencesUrl);
  const safeUnsubscribeUrl = escapeHtml(args.unsubscribeUrl);
  const safeName = escapeHtml(recipientName(args.recipientEmail));
  const preferenceReason = args.contentType === "game"
    ? "You’re receiving this email because you opted into new game notifications."
    : "You’re receiving this email because you opted into new CCG video and Retro Special notifications.";

  const image = args.thumbnail
    ? `<tr>
        <td style="padding:0 24px 20px">
          <a href="${safeContentUrl}" style="text-decoration:none">
            <img src="cid:${EMAIL_CONTENT_CID}" alt="${safeTitle}" width="592" style="display:block;width:100%;max-width:592px;height:auto;border:0;border-radius:8px">
          </a>
        </td>
      </tr>`
    : "";

  const testNotice = args.isTest
    ? `<tr>
        <td style="padding:0 24px 18px">
          <div style="padding:9px 12px;border:1px solid #40546d;background:#111d2e;color:#b9c8da;font-size:12px;line-height:1.45">
            <strong style="color:#ffffff">TEST EMAIL:</strong> sent only to the administrator address.
          </div>
        </td>
      </tr>`
    : "";

  const socialButtons = [
    shareButton("Facebook", "f", shareUrl("facebook", args.contentUrl, args.subject), "#1877f2"),
    shareButton("X", "X", shareUrl("x", args.contentUrl, args.subject), "#111111"),
    shareButton("WhatsApp", "W", shareUrl("whatsapp", args.contentUrl, args.subject), "#20b95a"),
    shareButton("Reddit", "r", shareUrl("reddit", args.contentUrl, args.subject), "#f04b23"),
    shareButton("Telegram", "➤", shareUrl("telegram", args.contentUrl, args.subject), "#229ed9"),
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(args.subject)}</title>
  <style>
    @media only screen and (max-width:660px) {
      .ccg-shell { width:100% !important; }
      .ccg-pad { padding-left:20px !important; padding-right:20px !important; }
      .ccg-title { font-size:22px !important; line-height:1.28 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#edf1f6;color:#e8eef7;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(presentation.heading)}: ${safeTitle}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#edf1f6">
    <tr>
      <td align="center" style="padding:18px 8px">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" class="ccg-shell" style="width:100%;max-width:640px;background:#071321;border:1px solid #20364d">
          <tr>
            <td style="padding:0;background:#153d65">
              <a href="${escapeHtml(args.siteOrigin)}" style="text-decoration:none">
                <img src="cid:${EMAIL_BANNER_CID}" alt="Cheeky Commodore Gamer" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0">
              </a>
            </td>
          </tr>
          <tr>
            <td class="ccg-pad" style="padding:24px 24px 16px">
              <p style="margin:0 0 15px;color:#e8eef7;font-size:16px;line-height:1.5">Hello ${safeName},</p>
              <h1 class="ccg-title" style="margin:0 0 15px;color:#ffffff;font-size:25px;line-height:1.28;font-weight:800">${presentation.emoji} ${escapeHtml(presentation.heading)}: ${safeTitle}</h1>
              <p style="margin:0;color:#d5deea;font-size:16px;line-height:1.55">${escapeHtml(presentation.intro)} 😇🕹👌</p>
            </td>
          </tr>
          ${image}
          <tr>
            <td align="center" style="padding:0 24px 20px">
              <a href="${safeContentUrl}" style="display:inline-block;padding:12px 20px;background:#2e6fe8;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;border-radius:7px">▶ ${escapeHtml(presentation.cta)}</a>
            </td>
          </tr>
          ${testNotice}
          <tr>
            <td class="ccg-pad" style="padding:20px 24px 14px;border-top:1px solid #1e3349">
              <h2 style="margin:0 0 13px;color:#ffffff;font-size:18px;line-height:1.3">${escapeHtml(presentation.shareLabel)}</h2>
              <div style="font-size:0;line-height:0">${socialButtons}</div>
            </td>
          </tr>
          <tr>
            <td class="ccg-pad" style="padding:18px 24px;border-top:1px solid #1e3349">
              <h2 style="margin:0 0 8px;color:#ffffff;font-size:18px;line-height:1.3">${escapeHtml(presentation.archiveLabel)}</h2>
              <p style="margin:0 0 12px;color:#b7c5d6;font-size:14px;line-height:1.55">${escapeHtml(presentation.archiveCopy)}</p>
              <a href="${escapeHtml(presentation.archiveUrl)}" style="color:#83d2ff;text-decoration:underline;font-size:14px;font-weight:700">Browse the archive</a>
            </td>
          </tr>
          <tr>
            <td class="ccg-pad" style="padding:16px 24px;border-top:1px solid #1e3349;background:#09111d">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="color:#b7c5d6;font-size:13px;line-height:1.5;padding-right:14px">Support the ongoing CCG website, video and archive costs — always optional.</td>
                  <td align="right" width="96">
                    <a href="${PAYPAL_URL}" style="display:inline-block;padding:8px 12px;background:#0878d1;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;border-radius:5px">PayPal</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="ccg-pad" style="padding:18px 24px;border-top:1px solid #1e3349;color:#91a6ba;font-size:12px;line-height:1.65">
              <p style="margin:0 0 7px">${escapeHtml(preferenceReason)} <a href="${safePreferencesUrl}" style="color:#78cef7">Manage preferences</a>.</p>
              <p style="margin:0 0 10px"><a href="${safeUnsubscribeUrl}" style="color:#78cef7">Stop these emails</a></p>
              <p style="margin:0;color:#a8bacb">— Cheeky Commodore Gamer 😇🕹👌</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildBrandedPlainText(args: BrandedEmailArgs): string {
  const presentation = presentationFor(args);
  const lines = [
    `${presentation.emoji} ${presentation.heading}: ${args.title}`,
    "",
    `Hello ${recipientName(args.recipientEmail)},`,
    "",
    `${presentation.intro} 😇🕹👌`,
    "",
    `${presentation.cta}: ${args.contentUrl}`,
    "",
    `${presentation.shareLabel}: ${args.contentUrl}`,
    "",
    `More from CCG: ${presentation.archiveUrl}`,
    "",
    `Support CCG: ${PAYPAL_URL}`,
    "",
    `Manage notification choices: ${args.preferencesUrl}`,
    "",
    "— Cheeky Commodore Gamer 😇🕹👌",
  ];

  if (args.isTest) lines.unshift("TEST EMAIL — administrator only.", "");
  return lines.join("\n");
}
