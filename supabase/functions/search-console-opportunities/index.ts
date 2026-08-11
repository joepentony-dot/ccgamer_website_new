import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const SEARCH_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SEARCH_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites";
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_QUERY_ROWS = 5000;
const MAX_PAGE_ROWS = 5000;

type SearchRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
};

type CacheRecord = {
  key: string;
  at: number;
  payload: unknown;
};

let cache: CacheRecord | null = null;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

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
    headers: { ...corsHeaders(), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function base64UrlBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(value: string): string {
  return base64UrlBytes(new TextEncoder().encode(value));
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body) throw new Error("Search Console private key is empty");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function serviceAccountToken(account: ServiceAccount): Promise<string> {
  const clientEmail = text(account.client_email);
  const privateKey = text(account.private_key);
  if (!clientEmail || !privateKey) throw new Error("Search Console service account is incomplete");

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlText(JSON.stringify({
    iss: clientEmail,
    scope: SEARCH_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google authorization failed (${response.status}): ${detail.slice(0, 180)}`);
  }

  const payload = await response.json().catch(() => ({}));
  const token = text(payload?.access_token);
  if (!token) throw new Error("Google authorization returned no access token");
  return token;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function period(days: number): {
  current: { start: string; end: string };
  previous: { start: string; end: string };
} {
  const today = new Date();
  const currentEnd = addDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())), -3);
  const currentStart = addDays(currentEnd, -(days - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return {
    current: { start: isoDate(currentStart), end: isoDate(currentEnd) },
    previous: { start: isoDate(previousStart), end: isoDate(previousEnd) },
  };
}

async function querySearchConsole(args: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
}): Promise<SearchRow[]> {
  const response = await fetch(`${SEARCH_ENDPOINT}/${encodeURIComponent(args.siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: args.startDate,
      endDate: args.endDate,
      dimensions: args.dimensions || [],
      type: "web",
      aggregationType: "auto",
      rowLimit: args.rowLimit || 1,
      dataState: "final",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Search Console query failed (${response.status}): ${detail.slice(0, 220)}`);
  }

  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.rows) ? payload.rows : [];
}

function metric(row?: SearchRow | null) {
  return {
    clicks: Number(row?.clicks) || 0,
    impressions: Number(row?.impressions) || 0,
    ctr: Number(row?.ctr) || 0,
    position: Number(row?.position) || 0,
  };
}

function expectedCtr(position: number): number {
  if (position <= 1.5) return 0.28;
  if (position <= 2.5) return 0.15;
  if (position <= 3.5) return 0.10;
  if (position <= 4.5) return 0.075;
  if (position <= 5.5) return 0.055;
  if (position <= 7.5) return 0.04;
  return 0.03;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentageChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return round(((current - previous) / previous) * 100, 1);
}

function normalizePage(value: unknown): string {
  const page = text(value);
  try {
    const parsed = new URL(page);
    if (parsed.origin !== ALLOWED_ORIGIN) return page;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return page;
  }
}

function buildQueryOpportunities(rows: SearchRow[]) {
  const parsed = rows.map((row) => {
    const query = text(row?.keys?.[0]);
    const page = text(row?.keys?.[1]);
    const metrics = metric(row);
    return {
      query,
      page,
      pagePath: normalizePage(page),
      ...metrics,
      ctrPercent: round(metrics.ctr * 100, 2),
      position: round(metrics.position, 1),
    };
  }).filter((row) => row.query && row.page && row.impressions > 0);

  const ranking = parsed
    .filter((row) => row.impressions >= 20 && row.position >= 4 && row.position <= 20)
    .map((row) => ({
      ...row,
      score: Math.round(row.impressions * ((21 - row.position) / 17) * Math.max(0.2, 1 - row.ctr * 4)),
    }))
    .sort((a, b) => b.score - a.score || b.impressions - a.impressions)
    .slice(0, 100);

  const ctr = parsed
    .filter((row) => row.impressions >= 50 && row.position <= 10)
    .map((row) => {
      const expected = expectedCtr(row.position);
      return {
        ...row,
        expectedCtrPercent: round(expected * 100, 1),
        ctrGapPercent: round((expected - row.ctr) * 100, 2),
        score: Math.max(0, Math.round(row.impressions * (expected - row.ctr))),
      };
    })
    .filter((row) => row.ctr < expectedCtr(row.position) * 0.65 && row.score > 0)
    .sort((a, b) => b.score - a.score || b.impressions - a.impressions)
    .slice(0, 100);

  return { ranking, ctr };
}

function pageMap(rows: SearchRow[]): Map<string, ReturnType<typeof metric>> {
  const result = new Map<string, ReturnType<typeof metric>>();
  rows.forEach((row) => {
    const page = text(row?.keys?.[0]);
    if (page) result.set(page, metric(row));
  });
  return result;
}

function buildPageTrends(currentRows: SearchRow[], previousRows: SearchRow[]) {
  const current = pageMap(currentRows);
  const previous = pageMap(previousRows);
  const pages = new Set([...current.keys(), ...previous.keys()]);
  const rows = Array.from(pages).map((page) => {
    const now = current.get(page) || metric();
    const before = previous.get(page) || metric();
    return {
      page,
      pagePath: normalizePage(page),
      current: { ...now, ctrPercent: round(now.ctr * 100, 2), position: round(now.position, 1) },
      previous: { ...before, ctrPercent: round(before.ctr * 100, 2), position: round(before.position, 1) },
      clicksChangePercent: percentageChange(now.clicks, before.clicks),
      impressionsChangePercent: percentageChange(now.impressions, before.impressions),
      positionChange: before.position > 0 && now.position > 0 ? round(before.position - now.position, 1) : null,
    };
  });

  const declines = rows
    .filter((row) => row.previous.impressions >= 50 && row.current.impressions > 0)
    .map((row) => {
      const clickLoss = Math.max(0, row.previous.clicks - row.current.clicks);
      const impressionLoss = Math.max(0, row.previous.impressions - row.current.impressions);
      return { ...row, score: Math.round(clickLoss * 20 + impressionLoss) };
    })
    .filter((row) => (row.clicksChangePercent ?? 0) <= -20 || (row.impressionsChangePercent ?? 0) <= -25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  const growth = rows
    .filter((row) => row.current.impressions >= 50 && row.previous.impressions > 0)
    .map((row) => {
      const clickGain = Math.max(0, row.current.clicks - row.previous.clicks);
      const impressionGain = Math.max(0, row.current.impressions - row.previous.impressions);
      return { ...row, score: Math.round(clickGain * 20 + impressionGain) };
    })
    .filter((row) => (row.clicksChangePercent ?? 0) >= 20 || (row.impressionsChangePercent ?? 0) >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  return { declines, growth };
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
  const rawServiceAccount = text(Deno.env.get("GSC_SERVICE_ACCOUNT_JSON"));
  const siteUrl = text(Deno.env.get("GSC_SITE_URL"));

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ success: false, error: "Supabase function environment is incomplete" }, 500);
  }

  const authHeader = text(req.headers.get("authorization"));
  const apikey = text(req.headers.get("apikey"));
  if (!apikey || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ success: false, error: "Administrator session is required" }, 401);
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: authHeader },
  });
  if (!authResponse.ok) return json({ success: false, error: "Invalid administrator session" }, 401);
  const authUser = await authResponse.json().catch(() => null);
  const actorId = text(authUser?.id);
  if (!actorId) return json({ success: false, error: "Invalid administrator account" }, 401);

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();
  if (profileError) return json({ success: false, error: "Administrator profile lookup failed" }, 500);
  const role = text(profile?.role).toLowerCase();
  if (!["admin", "superadmin"].includes(role)) return json({ success: false, error: "Forbidden" }, 403);

  if (!rawServiceAccount || !siteUrl) {
    return json({
      success: false,
      configured: false,
      error: "Search Console connection is not configured yet",
      missing: [
        !rawServiceAccount ? "GSC_SERVICE_ACCOUNT_JSON" : "",
        !siteUrl ? "GSC_SITE_URL" : "",
      ].filter(Boolean),
    }, 503);
  }

  let requestBody: { days?: number } = {};
  try {
    requestBody = await req.json();
  } catch {
    requestBody = {};
  }
  const requestedDays = Number(requestBody.days);
  const days = [28, 56, 90].includes(requestedDays) ? requestedDays : 28;
  const periods = period(days);
  const cacheKey = `${siteUrl}|${days}|${periods.current.end}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.at < CACHE_TTL_MS) {
    return json(cache.payload);
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount) as ServiceAccount;
  } catch {
    return json({ success: false, error: "GSC_SERVICE_ACCOUNT_JSON is not valid JSON" }, 500);
  }

  try {
    const accessToken = await serviceAccountToken(serviceAccount);
    const commonCurrent = {
      accessToken,
      siteUrl,
      startDate: periods.current.start,
      endDate: periods.current.end,
    };
    const commonPrevious = {
      accessToken,
      siteUrl,
      startDate: periods.previous.start,
      endDate: periods.previous.end,
    };

    const [currentTotalRows, previousTotalRows, queryRows, currentPageRows, previousPageRows] = await Promise.all([
      querySearchConsole({ ...commonCurrent, rowLimit: 1 }),
      querySearchConsole({ ...commonPrevious, rowLimit: 1 }),
      querySearchConsole({ ...commonCurrent, dimensions: ["query", "page"], rowLimit: MAX_QUERY_ROWS }),
      querySearchConsole({ ...commonCurrent, dimensions: ["page"], rowLimit: MAX_PAGE_ROWS }),
      querySearchConsole({ ...commonPrevious, dimensions: ["page"], rowLimit: MAX_PAGE_ROWS }),
    ]);

    const currentTotals = metric(currentTotalRows[0]);
    const previousTotals = metric(previousTotalRows[0]);
    const queryOpportunities = buildQueryOpportunities(queryRows);
    const pageTrends = buildPageTrends(currentPageRows, previousPageRows);

    const payload = {
      success: true,
      configured: true,
      generatedAt: new Date().toISOString(),
      siteUrl,
      days,
      periods,
      totals: {
        current: {
          ...currentTotals,
          ctrPercent: round(currentTotals.ctr * 100, 2),
          position: round(currentTotals.position, 1),
        },
        previous: {
          ...previousTotals,
          ctrPercent: round(previousTotals.ctr * 100, 2),
          position: round(previousTotals.position, 1),
        },
        change: {
          clicksPercent: percentageChange(currentTotals.clicks, previousTotals.clicks),
          impressionsPercent: percentageChange(currentTotals.impressions, previousTotals.impressions),
          ctrPoints: round((currentTotals.ctr - previousTotals.ctr) * 100, 2),
          position: previousTotals.position > 0 && currentTotals.position > 0
            ? round(previousTotals.position - currentTotals.position, 1)
            : null,
        },
      },
      opportunities: {
        ranking: queryOpportunities.ranking,
        ctr: queryOpportunities.ctr,
        declines: pageTrends.declines,
        growth: pageTrends.growth,
      },
      limits: {
        queryPageRowsReturned: queryRows.length,
        queryPageRowLimit: MAX_QUERY_ROWS,
        pageRowsReturned: currentPageRows.length,
        pageRowLimit: MAX_PAGE_ROWS,
        note: "Search Console API returns top rows and does not guarantee every query row.",
      },
    };

    cache = { key: cacheKey, at: Date.now(), payload };
    return json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ success: false, configured: true, error: message }, 502);
  }
});
