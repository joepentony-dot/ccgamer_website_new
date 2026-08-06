// CCG Phase 20C — branded announcement email presentation.
// Delivery, recipient consent, authentication and audit logging remain in index.ts.

const PAYPAL_URL = "https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL";

type BrandedEmailArgs = {
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
      intro: "A new Zzap!64 feature has just gone live, covering the magazine, its awards and the Commodore games that made the year memorable.",
      cta: "Watch the Zzap!64 Feature",
      shareLabel: "Share this Zzap!64 feature",
      archiveLabel: "More Zzap!64 features",
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
      archiveUrl: `${args.siteOrigin}/retro-events/`,
    };
  }

  if (args.contentType === "demo_music") {
    return {
      emoji: featured ? "⭐" : spotlight ? "🎯" : "🎵",
      heading: featured ? "Featured Amiga Video" : spotlight ? "Amiga Music Spotlight" : "New Amiga Demo Music",
      intro: "A new Amiga demo music video is now available on CCG, preserving another piece of the machine's audio legacy.",
      cta: "Watch the Amiga Video",
      shareLabel: "Share this Amiga video",
      archiveLabel: "More Amiga Demo Music",
      archiveUrl: `${args.siteOrigin}/amiga-demo-music/`,
    };
  }

  return {
    emoji: featured ? "⭐" : spotlight ? "🎯" : "🆕",
    heading: featured ? "Featured Classic" : spotlight ? "CCG Game Spotlight" : "New Game Added",
    intro: "A brand new game has just gone live on the CCG archive.",
    cta: "View Game Page",
    shareLabel: "Share this game",
    archiveLabel: "Browse More Commodore Games",
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

function shareButton(label: string, url: string, background: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;margin:0 7px 9px 0;padding:10px 13px;border-radius:999px;background:${background};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700">${escapeHtml(label)}</a>`;
}

export function buildBrandedEmailHtml(args: BrandedEmailArgs): string {
  const presentation = presentationFor(args);
  const safeTitle = escapeHtml(args.title);
  const safeContentUrl = escapeHtml(args.contentUrl);
  const safePreferencesUrl = escapeHtml(args.preferencesUrl);
  const safeUnsubscribeUrl = escapeHtml(args.unsubscribeUrl);
  const safeName = escapeHtml(recipientName(args.recipientEmail));
  const logoUrl = `${args.siteOrigin}/resources/images/ccgamer-logo.png`;
  const preferenceReason = args.contentType === "game"
    ? "You’re receiving this email because you opted into new game notifications."
    : "You’re receiving this email because you opted into new CCG video and Retro Special notifications.";

  const image = args.thumbnail
    ? `<tr><td style="padding:0 30px 24px"><a href="${safeContentUrl}" style="text-decoration:none"><img src="${escapeHtml(args.thumbnail)}" alt="${safeTitle}" width="620" style="display:block;width:100%;max-width:620px;height:auto;border:0;border-radius:12px"></a></td></tr>`
    : "";

  const testNotice = args.isTest
    ? `<tr><td style="padding:0 30px 24px"><div style="padding:14px 16px;border-radius:9px;background:#fff4c2;color:#382b00;font-size:14px;font-weight:700;border:1px solid #e7c84d">TEST EMAIL — this was sent only to the administrator address.</div></td></tr>`
    : "";

  const socialButtons = [
    shareButton("Facebook", shareUrl("facebook", args.contentUrl, args.subject), "#1877f2"),
    shareButton("X", shareUrl("x", args.contentUrl, args.subject), "#111111"),
    shareButton("WhatsApp", shareUrl("whatsapp", args.contentUrl, args.subject), "#25d366"),
    shareButton("Reddit", shareUrl("reddit", args.contentUrl, args.subject), "#ff4500"),
    shareButton("Telegram", shareUrl("telegram", args.contentUrl, args.subject), "#229ed9"),
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(args.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#060b17;color:#eef5ff;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(presentation.heading)}: ${safeTitle}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#060b17">
    <tr>
      <td align="center" style="padding:24px 10px">
        <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#081323;border:1px solid #203b58;border-radius:16px;overflow:hidden">
          <tr>
            <td align="center" style="padding:24px 26px 20px;background:#12345a;background-image:linear-gradient(135deg,#12345a,#0a1c35 72%)">
              <a href="${escapeHtml(args.siteOrigin)}" style="text-decoration:none">
                <img src="${escapeHtml(logoUrl)}" alt="Cheeky Commodore Gamer" width="310" style="display:block;width:100%;max-width:310px;height:auto;border:0;margin:0 auto">
              </a>
              <p style="margin:14px 0 0;color:#94d8ff;font-size:13px;letter-spacing:.14em;font-weight:700">COMMODORE 64 · AMIGA · RETRO GAMING</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 30px 12px">
              <p style="margin:0 0 18px;color:#eef5ff;font-size:18px;line-height:1.5">Hello ${safeName},</p>
              <p style="margin:0 0 10px;color:#72cfff;font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">${presentation.emoji} ${escapeHtml(presentation.heading)}</p>
              <h1 style="margin:0 0 18px;color:#ffffff;font-size:30px;line-height:1.2">${safeTitle}</h1>
              <p style="margin:0 0 18px;color:#dbe6f7;font-size:17px;line-height:1.65">${escapeHtml(presentation.intro)} 😇🕹👌</p>
            </td>
          </tr>
          ${image}
          <tr>
            <td align="center" style="padding:0 30px 28px">
              <a href="${safeContentUrl}" style="display:inline-block;padding:15px 24px;border-radius:10px;background:#2f72ff;color:#ffffff;text-decoration:none;font-size:17px;font-weight:800">▶ ${escapeHtml(presentation.cta)}</a>
            </td>
          </tr>
          ${testNotice}
          <tr>
            <td style="padding:26px 30px;border-top:1px solid #1e334a">
              <h2 style="margin:0 0 16px;color:#ffffff;font-size:20px">${escapeHtml(presentation.shareLabel)}</h2>
              <div>${socialButtons}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 30px;border-top:1px solid #1e334a">
              <h2 style="margin:0 0 10px;color:#ffffff;font-size:20px">${escapeHtml(presentation.archiveLabel)}</h2>
              <p style="margin:0 0 18px;color:#b9c9dc;font-size:15px;line-height:1.6">Continue through the CCG archive for more Commodore games, videos and magazine features.</p>
              <a href="${escapeHtml(presentation.archiveUrl)}" style="display:inline-block;padding:11px 17px;border-radius:8px;background:#152f4b;color:#8fd8ff;text-decoration:none;font-weight:700">Browse the archive</a>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 30px;border-top:1px solid #1e334a;background:#09101d">
              <p style="margin:0 0 16px;color:#d4e0ee;font-size:15px;line-height:1.6">Supporting Cheeky Commodore Gamer helps with the ongoing website, video and archive costs. It is always optional and appreciated.</p>
              <a href="${PAYPAL_URL}" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#0878d1;color:#ffffff;text-decoration:none;font-weight:800">Support CCG with PayPal</a>
            </td>
          </tr>
          <tr>
            <td style="padding:25px 30px;border-top:1px solid #1e334a;color:#8fa7bb;font-size:13px;line-height:1.7">
              <p style="margin:0 0 8px">${escapeHtml(preferenceReason)} <a href="${safePreferencesUrl}" style="color:#7fd7ff">Manage preferences</a>.</p>
              <p style="margin:0 0 12px"><a href="${safeUnsubscribeUrl}" style="color:#7fd7ff">Stop these emails</a></p>
              <p style="margin:0;color:#a9bfd1">— Cheeky Commodore Gamer 😇🕹👌</p>
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
