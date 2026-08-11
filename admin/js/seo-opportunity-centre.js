import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DEFAULT_SEARCH_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';
const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const MAX_QUERY_ROWS = 5000;
const MAX_PAGE_ROWS = 5000;

const state = {
  report: null,
  loading: false,
  authorizing: false,
  config: null,
  tokenClient: null,
  googleAccessToken: '',
  googleTokenExpiresAt: 0,
  googleLibraryPromise: null,
};

const el = {
  days: document.querySelector('[data-seo-days]'),
  refresh: document.querySelector('[data-seo-refresh]'),
  export: document.querySelector('[data-seo-export]'),
  status: document.querySelector('[data-seo-status]'),
  summary: document.querySelector('[data-seo-summary]'),
  stats: Object.fromEntries(Array.from(document.querySelectorAll('[data-seo-stat]')).map((node) => [node.dataset.seoStat, node])),
  changes: Object.fromEntries(Array.from(document.querySelectorAll('[data-seo-change]')).map((node) => [node.dataset.seoChange, node])),
  sections: Object.fromEntries(Array.from(document.querySelectorAll('[data-seo-section]')).map((node) => [node.dataset.seoSection, node])),
  counts: Object.fromEntries(Array.from(document.querySelectorAll('[data-seo-count]')).map((node) => [node.dataset.seoCount, node])),
  tables: Object.fromEntries(Array.from(document.querySelectorAll('[data-seo-table]')).map((node) => [node.dataset.seoTable, node])),
};

init();

async function init() {
  const access = await ensureRole(['admin', 'superadmin']);
  if (!access) return;
  await startAccessMonitor();
  await initAdminNav({ pageLabel: 'SEO Opportunity Centre', active: 'seo' });

  el.refresh?.addEventListener('click', handleRefreshClick);
  el.days?.addEventListener('change', handleDaysChange);
  el.export?.addEventListener('click', exportCsv);

  await loadConnectionConfig();
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    throw new Error('Supabase client bootstrap is unavailable on this page.');
  }
  return window.ccgSupabase.getClient();
}

async function extractFunctionError(error) {
  if (!error) return { message: 'Unknown Search Console configuration error.' };
  const context = error.context;
  if (context && typeof context.clone === 'function') {
    try {
      const payload = await context.clone().json();
      if (payload && typeof payload === 'object') return payload;
    } catch {
      // Fall through to the safe generic message below.
    }
  }
  return { message: String(error.message || error) };
}

async function loadConnectionConfig() {
  state.loading = true;
  updateControls();
  setStatus('Checking the keyless Search Console connection…', 'loading');

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('search-console-opportunities', {
      body: { action: 'config' },
    });

    if (error) {
      const detail = await extractFunctionError(error);
      throw new Error(detail.error || detail.message || error.message || 'Search Console configuration request failed.');
    }
    if (!data?.success) throw new Error(data?.error || 'Search Console configuration was not returned.');

    state.config = data;
    if (!data.configured) {
      const missing = Array.isArray(data.missing) ? data.missing.filter(Boolean) : [];
      setStatus(
        `Search Console needs its keyless OAuth configuration${missing.length ? `: ${missing.join(', ')}` : ''}. No Google private key or refresh token is required.`,
        'error',
      );
      clearReport();
      return;
    }

    await loadGoogleIdentityServices();
    configureGoogleTokenClient(data.oauthClientId, data.scope || DEFAULT_SEARCH_SCOPE);
    setStatus(
      `Keyless Search Console connection is ready for ${data.siteUrl}. Click “Connect Google Search Console” to grant temporary read-only access for this admin session.`,
      'ok',
    );
  } catch (error) {
    state.config = null;
    clearReport();
    setStatus(`Search Console setup could not be checked: ${error.message || error}`, 'error');
  } finally {
    state.loading = false;
    updateControls();
  }
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (state.googleLibraryPromise) return state.googleLibraryPromise;

  state.googleLibraryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'));
    document.head.append(script);
  });

  return state.googleLibraryPromise;
}

function configureGoogleTokenClient(clientId, scope) {
  if (!window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error('Google Identity Services authorization is unavailable.');
  }

  state.tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: String(clientId || '').trim(),
    scope: String(scope || DEFAULT_SEARCH_SCOPE).trim(),
    callback: handleGoogleTokenResponse,
    error_callback: handleGooglePopupError,
  });
}

function handleRefreshClick() {
  if (state.loading || state.authorizing) return;
  if (hasValidGoogleToken()) {
    void loadReport();
    return;
  }
  requestGoogleAccess();
}

function handleDaysChange() {
  if (state.loading || state.authorizing) return;
  if (hasValidGoogleToken()) {
    void loadReport();
    return;
  }
  if (state.config?.configured) {
    setStatus('Comparison window changed. Click “Connect Google Search Console” to load it with temporary read-only access.', 'ok');
  }
}

function requestGoogleAccess() {
  if (!state.config?.configured || !state.tokenClient) {
    setStatus('Search Console OAuth is not configured yet.', 'error');
    return;
  }

  state.authorizing = true;
  updateControls();
  setStatus('Waiting for Google account selection and read-only Search Console permission…', 'loading');

  try {
    state.tokenClient.requestAccessToken();
  } catch (error) {
    state.authorizing = false;
    updateControls();
    setStatus(`Google authorization could not start: ${error.message || error}`, 'error');
  }
}

function handleGoogleTokenResponse(response) {
  state.authorizing = false;

  if (response?.error) {
    clearGoogleToken();
    updateControls();
    setStatus(`Google authorization was not granted: ${response.error_description || response.error}`, 'error');
    return;
  }

  const accessToken = String(response?.access_token || '').trim();
  const oauth = window.google?.accounts?.oauth2;
  const requiredScope = state.config?.scope || DEFAULT_SEARCH_SCOPE;
  const scopeGranted = oauth?.hasGrantedAllScopes
    ? oauth.hasGrantedAllScopes(response, requiredScope)
    : String(response?.scope || '').split(/\s+/).includes(requiredScope);

  if (!accessToken || !scopeGranted) {
    clearGoogleToken();
    updateControls();
    setStatus('Google did not grant the required read-only Search Console permission.', 'error');
    return;
  }

  const expiresIn = Math.max(60, Number(response?.expires_in) || 3600);
  state.googleAccessToken = accessToken;
  state.googleTokenExpiresAt = Date.now() + (expiresIn * 1000);
  updateControls();
  void loadReport();
}

function handleGooglePopupError(error) {
  state.authorizing = false;
  updateControls();
  const type = String(error?.type || 'unknown');
  const message = type === 'popup_closed'
    ? 'Google authorization was closed. No Search Console data was accessed.'
    : type === 'popup_failed_to_open'
      ? 'The Google authorization window could not open. Allow pop-ups for this admin page and try again.'
      : 'Google authorization could not be completed.';
  setStatus(message, type === 'popup_closed' ? 'ok' : 'error');
}

function hasValidGoogleToken() {
  return Boolean(state.googleAccessToken) && state.googleTokenExpiresAt - Date.now() > 60_000;
}

function clearGoogleToken() {
  state.googleAccessToken = '';
  state.googleTokenExpiresAt = 0;
}

async function googleFetch(url, options = {}) {
  if (!hasValidGoogleToken()) {
    clearGoogleToken();
    throw new Error('Google Search Console authorization has expired. Click Connect and try again.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${state.googleAccessToken}`);
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });

  if (response.status === 401) {
    clearGoogleToken();
    updateControls();
    throw new Error('Google Search Console authorization has expired. Click Connect and try again.');
  }
  return response;
}

async function verifySiteAccess(siteUrl) {
  const response = await googleFetch(SEARCH_ENDPOINT);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Google could not list Search Console properties (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`);
  }

  const payload = await response.json().catch(() => ({}));
  const entries = Array.isArray(payload?.siteEntry) ? payload.siteEntry : [];
  const match = entries.find((entry) => String(entry?.siteUrl || '') === siteUrl);
  if (!match) {
    throw new Error(`The selected Google account does not have access to the configured Search Console property: ${siteUrl}`);
  }
  return String(match.permissionLevel || 'site access');
}

async function querySearchConsole({ accessSiteUrl, startDate, endDate, dimensions = [], rowLimit = 1 }) {
  const response = await googleFetch(`${SEARCH_ENDPOINT}/${encodeURIComponent(accessSiteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      type: 'web',
      aggregationType: 'auto',
      rowLimit,
      dataState: 'final',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Search Console query failed (${response.status})${detail ? `: ${detail.slice(0, 220)}` : ''}`);
  }

  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.rows) ? payload.rows : [];
}

async function loadReport() {
  if (state.loading) return;
  if (!state.config?.configured) {
    setStatus('Search Console OAuth is not configured yet.', 'error');
    return;
  }
  if (!hasValidGoogleToken()) {
    clearGoogleToken();
    updateControls();
    setStatus('Click “Connect Google Search Console” to grant temporary read-only access.', 'ok');
    return;
  }

  state.loading = true;
  updateControls();
  setStatus('Loading finalized Search Console data directly from Google…', 'loading');

  try {
    const days = Number(el.days?.value || 28);
    const periods = period([28, 56, 90].includes(days) ? days : 28);
    const siteUrl = String(state.config.siteUrl || '').trim();
    await verifySiteAccess(siteUrl);

    const commonCurrent = {
      accessSiteUrl: siteUrl,
      startDate: periods.current.start,
      endDate: periods.current.end,
    };
    const commonPrevious = {
      accessSiteUrl: siteUrl,
      startDate: periods.previous.start,
      endDate: periods.previous.end,
    };

    const [currentTotalRows, previousTotalRows, queryRows, currentPageRows, previousPageRows] = await Promise.all([
      querySearchConsole({ ...commonCurrent, rowLimit: 1 }),
      querySearchConsole({ ...commonPrevious, rowLimit: 1 }),
      querySearchConsole({ ...commonCurrent, dimensions: ['query', 'page'], rowLimit: MAX_QUERY_ROWS }),
      querySearchConsole({ ...commonCurrent, dimensions: ['page'], rowLimit: MAX_PAGE_ROWS }),
      querySearchConsole({ ...commonPrevious, dimensions: ['page'], rowLimit: MAX_PAGE_ROWS }),
    ]);

    const currentTotals = metric(currentTotalRows[0]);
    const previousTotals = metric(previousTotalRows[0]);
    const parsedQueries = parseQueryRows(queryRows);
    const queryOpportunities = buildQueryOpportunities(parsedQueries);
    const pageTrends = buildPageTrends(currentPageRows, previousPageRows);
    const legacy = buildLegacyOpportunities(pageTrends.all, parsedQueries);
    const workQueue = buildWorkQueue({
      parsedQueries,
      ranking: queryOpportunities.ranking,
      ctr: queryOpportunities.ctr,
      pageTrends,
      legacy,
    });

    const report = {
      success: true,
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
        workQueue,
        ranking: queryOpportunities.ranking,
        ctr: queryOpportunities.ctr,
        legacy,
        mixed: pageTrends.mixed,
        declines: pageTrends.declines,
        growth: pageTrends.growth,
      },
      limits: {
        queryPageRowsReturned: queryRows.length,
        queryPageRowLimit: MAX_QUERY_ROWS,
        pageRowsReturned: currentPageRows.length,
        pageRowLimit: MAX_PAGE_ROWS,
      },
    };

    state.report = report;
    renderReport(report);

    const generated = new Date(report.generatedAt);
    const generatedText = Number.isNaN(generated.getTime()) ? 'just now' : generated.toLocaleString('en-GB');
    setStatus(
      `Search Console report loaded for ${periods.current.start} to ${periods.current.end}. Generated ${generatedText}. Google returned ${Number(queryRows.length).toLocaleString('en-GB')} query/page rows; lower-volume rows may be omitted by the API.`,
      'ok',
    );
  } catch (error) {
    clearReport();
    setStatus(`Search Console report could not be loaded: ${error.message || error}`, 'error');
  } finally {
    state.loading = false;
    updateControls();
  }
}

function period(days) {
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

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function metric(row = null) {
  return {
    clicks: Number(row?.clicks) || 0,
    impressions: Number(row?.impressions) || 0,
    ctr: Number(row?.ctr) || 0,
    position: Number(row?.position) || 0,
  };
}

function expectedCtr(position) {
  if (position <= 1.5) return 0.28;
  if (position <= 2.5) return 0.15;
  if (position <= 3.5) return 0.10;
  if (position <= 4.5) return 0.075;
  if (position <= 5.5) return 0.055;
  if (position <= 7.5) return 0.04;
  return 0.03;
}

function opportunityCtr(position) {
  if (position <= 10) return expectedCtr(position);
  if (position <= 15) return 0.02;
  if (position <= 20) return 0.0125;
  return 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentageChange(current, previous) {
  if (previous <= 0) return current > 0 ? 100 : null;
  return round(((current - previous) / previous) * 100, 1);
}

function normalizePage(value) {
  const page = String(value || '').trim();
  try {
    const parsed = new URL(page);
    if (parsed.origin !== SITE_ORIGIN) return page;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return page;
  }
}

function parseQueryRows(rows) {
  return rows.map((row) => {
    const query = String(row?.keys?.[0] || '').trim();
    const page = String(row?.keys?.[1] || '').trim();
    const metrics = metric(row);
    const benchmark = opportunityCtr(metrics.position);
    return {
      query,
      page,
      pagePath: normalizePage(page),
      ...metrics,
      ctrPercent: round(metrics.ctr * 100, 2),
      position: round(metrics.position, 1),
      benchmarkCtrPercent: round(benchmark * 100, 2),
      potentialClicks: benchmark > metrics.ctr
        ? Math.max(0, round(metrics.impressions * (benchmark - metrics.ctr), 1))
        : 0,
    };
  }).filter((row) => row.query && row.page && row.impressions > 0);
}

function buildQueryOpportunities(parsed) {
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
        potentialClicks: Math.max(0, round(row.impressions * (expected - row.ctr), 1)),
      };
    })
    .filter((row) => row.ctr < expectedCtr(row.position) * 0.65 && row.score > 0)
    .sort((a, b) => b.score - a.score || b.impressions - a.impressions)
    .slice(0, 100);

  return { ranking, ctr };
}

function pageMap(rows) {
  const result = new Map();
  rows.forEach((row) => {
    const page = String(row?.keys?.[0] || '').trim();
    if (page) result.set(page, metric(row));
  });
  return result;
}

function hasPositiveTrend(row) {
  return (row.clicksChangePercent ?? -Infinity) >= 20 || (row.impressionsChangePercent ?? -Infinity) >= 25;
}

function hasNegativeTrend(row) {
  return (row.clicksChangePercent ?? Infinity) <= -20 || (row.impressionsChangePercent ?? Infinity) <= -25;
}

function trendScore(row, direction) {
  const now = row.current;
  const before = row.previous;
  if (direction === 'decline') {
    return Math.round(Math.max(0, before.clicks - now.clicks) * 20 + Math.max(0, before.impressions - now.impressions));
  }
  if (direction === 'growth') {
    return Math.round(Math.max(0, now.clicks - before.clicks) * 20 + Math.max(0, now.impressions - before.impressions));
  }
  const clickSwing = Math.abs((row.clicksChangePercent ?? 0));
  const impressionSwing = Math.abs((row.impressionsChangePercent ?? 0));
  return Math.round(Math.min(500, clickSwing + impressionSwing));
}

function buildPageTrends(currentRows, previousRows) {
  const current = pageMap(currentRows);
  const previous = pageMap(previousRows);
  const pages = new Set([...current.keys(), ...previous.keys()]);
  const all = Array.from(pages).map((page) => {
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

  const material = all.filter((row) => Math.max(row.current.impressions, row.previous.impressions) >= 50);
  const mixed = material
    .filter((row) => hasPositiveTrend(row) && hasNegativeTrend(row))
    .map((row) => ({ ...row, score: trendScore(row, 'mixed') }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
  const declines = material
    .filter((row) => hasNegativeTrend(row) && !hasPositiveTrend(row) && row.current.impressions > 0)
    .map((row) => ({ ...row, score: trendScore(row, 'decline') }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
  const growth = material
    .filter((row) => hasPositiveTrend(row) && !hasNegativeTrend(row) && row.previous.impressions > 0)
    .map((row) => ({ ...row, score: trendScore(row, 'growth') }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  return { all, mixed, declines, growth };
}

function legacyRouteType(pagePath) {
  if (/^\/games\/game\.html(?:\?|$)/i.test(pagePath)) return 'Legacy game route';
  if (/^\/music\/composer\.html(?:\?|$)/i.test(pagePath)) return 'Legacy composer route';
  return '';
}

function buildLegacyOpportunities(pageRows, parsedQueries) {
  const queriesByPage = new Map();
  parsedQueries.forEach((row) => {
    if (!queriesByPage.has(row.page)) queriesByPage.set(row.page, []);
    queriesByPage.get(row.page).push(row);
  });

  return pageRows
    .map((row) => ({ ...row, legacyType: legacyRouteType(row.pagePath) }))
    .filter((row) => row.legacyType && row.current.impressions > 0)
    .map((row) => ({
      ...row,
      queries: (queriesByPage.get(row.page) || []).sort((a, b) => b.impressions - a.impressions).slice(0, 12),
      action: 'Review redirect and canonical consolidation',
      score: Math.round(Math.min(100, 25 + Math.log10(row.current.impressions + 1) * 20)),
    }))
    .sort((a, b) => b.current.impressions - a.current.impressions);
}

function weightedPosition(rows) {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  if (!impressions) return 0;
  return rows.reduce((sum, row) => sum + row.position * row.impressions, 0) / impressions;
}

function groupQueryRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.page)) groups.set(row.page, []);
    groups.get(row.page).push(row);
  });

  return Array.from(groups.entries()).map(([page, pageRows]) => {
    const unique = new Map();
    pageRows.forEach((row) => unique.set(`${row.query}|${row.page}`, row));
    const queries = Array.from(unique.values()).sort((a, b) => b.impressions - a.impressions);
    const impressions = queries.reduce((sum, row) => sum + row.impressions, 0);
    const clicks = queries.reduce((sum, row) => sum + row.clicks, 0);
    return {
      page,
      pagePath: normalizePage(page),
      queries,
      impressions,
      clicks,
      ctrPercent: impressions ? round((clicks / impressions) * 100, 2) : 0,
      position: round(weightedPosition(queries), 1),
      potentialClicks: round(queries.reduce((sum, row) => sum + (Number(row.potentialClicks) || 0), 0), 1),
      score: Math.max(...queries.map((row) => Number(row.score) || 0), 0),
    };
  }).sort((a, b) => b.score - a.score || b.impressions - a.impressions);
}

function priorityScore(item) {
  const impressions = Number(item.impressions) || 0;
  const position = Number(item.position) || 0;
  const potentialClicks = Number(item.potentialClicks) || 0;
  const demand = Math.min(35, Math.log10(impressions + 1) * 13);
  const proximity = position > 0 && position <= 20 ? Math.max(0, Math.min(25, (21 - position) * 1.5)) : 0;
  const clickOpportunity = Math.min(25, potentialClicks * 2.5);
  const signal = item.legacy ? 15 : item.trendType === 'decline' ? 12 : item.trendType === 'mixed' ? 10 : item.trendType === 'growth' ? 6 : 0;
  return Math.round(Math.min(100, demand + proximity + clickOpportunity + signal));
}

function recommendedAction(item) {
  if (item.legacy) {
    return {
      label: 'Consolidate legacy URL',
      detail: 'Confirm the legacy route redirects or canonicals to the intended modern page. Do not remove the old URL blindly while Google is still surfacing it.',
    };
  }
  if (item.ctrRows.length && item.potentialClicks >= 1) {
    return {
      label: 'Improve search snippet',
      detail: 'Review the title and description against the strongest queries while keeping the page aligned with the search intent.',
    };
  }
  if (item.rankingRows.length && item.position <= 10 && item.clicks === 0) {
    return {
      label: 'Improve CTR now',
      detail: 'The page is already visible on page one but is not earning clicks from these tracked queries.',
    };
  }
  if (item.trendType === 'decline') {
    return {
      label: 'Investigate decline',
      detail: 'Compare the page with its previous period, check lost queries and strengthen relevance before making large structural changes.',
    };
  }
  if (item.trendType === 'mixed') {
    return {
      label: 'Review mixed movement',
      detail: 'Clicks and impressions are moving in opposite directions, so this page needs diagnosis rather than a simple growth/decline label.',
    };
  }
  if (item.rankingRows.length && item.position > 10) {
    return {
      label: 'Strengthen page relevance',
      detail: 'Improve focused copy and internal links for the strongest queries already sitting within reach of page one.',
    };
  }
  if (item.trendType === 'growth') {
    return {
      label: 'Protect and expand',
      detail: 'Google visibility is growing. Preserve the successful intent and consider supporting internal links or closely related coverage.',
    };
  }
  return {
    label: 'Review opportunity',
    detail: 'Inspect the page and its strongest Search Console queries before deciding on a change.',
  };
}

function buildWorkQueue({ parsedQueries, ranking, ctr, pageTrends, legacy }) {
  const pages = new Map();
  const allTrendMap = new Map(pageTrends.all.map((row) => [row.page, row]));
  const legacyMap = new Map(legacy.map((row) => [row.page, row]));
  const mixedMap = new Map(pageTrends.mixed.map((row) => [row.page, row]));
  const declineMap = new Map(pageTrends.declines.map((row) => [row.page, row]));
  const growthMap = new Map(pageTrends.growth.map((row) => [row.page, row]));
  const rankingMap = new Map();
  const ctrMap = new Map();

  ranking.forEach((row) => {
    if (!rankingMap.has(row.page)) rankingMap.set(row.page, []);
    rankingMap.get(row.page).push(row);
  });
  ctr.forEach((row) => {
    if (!ctrMap.has(row.page)) ctrMap.set(row.page, []);
    ctrMap.get(row.page).push(row);
  });

  [...rankingMap.keys(), ...ctrMap.keys(), ...legacyMap.keys(), ...mixedMap.keys(), ...declineMap.keys(), ...growthMap.keys()]
    .forEach((page) => pages.set(page, true));

  const allQueriesByPage = new Map();
  parsedQueries.forEach((row) => {
    if (!allQueriesByPage.has(row.page)) allQueriesByPage.set(row.page, []);
    allQueriesByPage.get(row.page).push(row);
  });

  return Array.from(pages.keys()).map((page) => {
    const rankingRows = rankingMap.get(page) || [];
    const ctrRows = ctrMap.get(page) || [];
    const signalQueries = new Map();
    [...rankingRows, ...ctrRows].forEach((row) => signalQueries.set(`${row.query}|${row.page}`, row));
    const queries = Array.from(signalQueries.values()).sort((a, b) => b.impressions - a.impressions);
    const trend = allTrendMap.get(page) || null;
    const legacyRow = legacyMap.get(page) || null;
    const trendType = mixedMap.has(page) ? 'mixed' : declineMap.has(page) ? 'decline' : growthMap.has(page) ? 'growth' : '';
    const fallbackQueries = (allQueriesByPage.get(page) || []).sort((a, b) => b.impressions - a.impressions);
    const current = trend?.current || null;
    const impressions = current?.impressions || queries.reduce((sum, row) => sum + row.impressions, 0);
    const clicks = current?.clicks || queries.reduce((sum, row) => sum + row.clicks, 0);
    const position = current?.position || round(weightedPosition(queries), 1);
    const ctrPercent = current?.ctrPercent ?? (impressions ? round((clicks / impressions) * 100, 2) : 0);
    const potentialClicks = round(Array.from(signalQueries.values()).reduce((sum, row) => sum + (Number(row.potentialClicks) || 0), 0), 1);
    const item = {
      page,
      pagePath: normalizePage(page),
      rankingRows,
      ctrRows,
      queries: (queries.length ? queries : fallbackQueries).slice(0, 12),
      impressions,
      clicks,
      position,
      ctrPercent,
      potentialClicks,
      legacy: Boolean(legacyRow),
      legacyType: legacyRow?.legacyType || '',
      trendType,
      trend,
    };
    item.action = recommendedAction(item);
    item.priority = priorityScore(item);
    return item;
  }).sort((a, b) => b.priority - a.priority || b.impressions - a.impressions).slice(0, 50);
}

function updateControls() {
  if (el.refresh) {
    if (state.loading) {
      el.refresh.disabled = true;
      el.refresh.textContent = 'Loading…';
    } else if (state.authorizing) {
      el.refresh.disabled = true;
      el.refresh.textContent = 'Connecting…';
    } else if (!state.config?.configured || !state.tokenClient) {
      el.refresh.disabled = true;
      el.refresh.textContent = 'Search Console setup required';
    } else if (hasValidGoogleToken()) {
      el.refresh.disabled = false;
      el.refresh.textContent = 'Refresh Search Console';
    } else {
      el.refresh.disabled = false;
      el.refresh.textContent = 'Connect Google Search Console';
    }
  }
  if (el.days) el.days.disabled = state.loading || state.authorizing;
  if (el.export) el.export.disabled = state.loading || state.authorizing || !state.report;
}

function setStatus(message, status) {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.dataset.state = status;
}

function clearReport() {
  state.report = null;
  if (el.summary) el.summary.hidden = true;
  Object.values(el.sections).forEach((section) => {
    if (section) section.hidden = true;
  });
  if (el.export) el.export.disabled = true;
}

function renderReport(report) {
  if (el.summary) el.summary.hidden = false;
  renderSummary(report.totals);
  const opportunities = report.opportunities || {};
  renderWorkQueue(opportunities.workQueue || []);
  renderLegacyTable(opportunities.legacy || []);
  renderQueryGroupTable('ranking', opportunities.ranking || [], 'ranking');
  renderQueryGroupTable('ctr', opportunities.ctr || [], 'ctr');
  renderTrendTable('mixed', opportunities.mixed || [], 'Review mixed signal');
  renderTrendTable('declines', opportunities.declines || [], 'Investigate decline');
  renderTrendTable('growth', opportunities.growth || [], 'Protect and expand');
  if (el.export) el.export.disabled = false;
}

function renderSummary(totals) {
  const current = totals?.current || {};
  const change = totals?.change || {};

  setText(el.stats.clicks, number(current.clicks));
  setText(el.stats.impressions, number(current.impressions));
  setText(el.stats.ctr, `${fixed(current.ctrPercent, 2)}%`);
  setText(el.stats.position, fixed(current.position, 1));

  setChange(el.changes.clicks, change.clicksPercent, '%', ' vs previous period');
  setChange(el.changes.impressions, change.impressionsPercent, '%', ' vs previous period');
  setChange(el.changes.ctr, change.ctrPoints, ' pts', ' CTR change');
  setChange(el.changes.position, change.position, '', ' positions', true);
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function setChange(node, value, suffix, label, positiveIsGood = true) {
  if (!node) return;
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    node.textContent = 'No comparison available';
    node.removeAttribute('data-direction');
    return;
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? '+' : '';
  node.textContent = `${sign}${fixed(numeric, suffix === '%' ? 1 : 2)}${suffix}${label}`;
  const good = positiveIsGood ? numeric > 0 : numeric < 0;
  const bad = positiveIsGood ? numeric < 0 : numeric > 0;
  node.dataset.direction = good ? 'up' : bad ? 'down' : 'flat';
}

function queryDetails(rows) {
  if (!rows.length) return '<span class="seo-muted">No tracked query rows</span>';
  const items = rows.slice(0, 12).map((row) => `<li><strong>${escapeHtml(row.query)}</strong><span>${number(row.impressions)} imp · ${number(row.clicks)} clicks · pos ${fixed(row.position, 1)} · CTR ${fixed(row.ctrPercent, 2)}%</span></li>`).join('');
  return `<details class="seo-query-details"><summary>${rows.length} quer${rows.length === 1 ? 'y' : 'ies'}</summary><ul>${items}</ul></details>`;
}

function signalPills(item) {
  const pills = [];
  if (item.legacy) pills.push(`<span class="seo-signal seo-signal--legacy">${escapeHtml(item.legacyType || 'Legacy URL')}</span>`);
  if (item.ctrRows?.length) pills.push('<span class="seo-signal">CTR</span>');
  if (item.rankingRows?.length) pills.push('<span class="seo-signal">Ranking</span>');
  if (item.trendType === 'mixed') pills.push('<span class="seo-signal seo-signal--mixed">Mixed</span>');
  if (item.trendType === 'decline') pills.push('<span class="seo-signal seo-signal--down">Decline</span>');
  if (item.trendType === 'growth') pills.push('<span class="seo-signal seo-signal--up">Growth</span>');
  return pills.join(' ');
}

function renderWorkQueue(rows) {
  const section = el.sections.workQueue;
  const host = el.tables.workQueue;
  if (!section || !host) return;
  section.hidden = false;
  setText(el.counts.workQueue, number(rows.length));

  if (!rows.length) {
    host.innerHTML = '<p class="seo-empty">No material work-queue items were found for this period.</p>';
    return;
  }

  const body = rows.map((row) => `<tr>
    <td data-number><span class="seo-priority" data-priority="${priorityBand(row.priority)}">${number(row.priority)}</span></td>
    <td><strong>${escapeHtml(row.action.label)}</strong><small class="seo-action-detail">${escapeHtml(row.action.detail)}</small></td>
    <td>${pageLink(row.page, row.pagePath)}</td>
    <td>${signalPills(row)}</td>
    <td data-number>${number(row.impressions)}</td>
    <td data-number>${number(row.clicks)}</td>
    <td data-number>${fixed(row.position, 1)}</td>
    <td data-number>${row.potentialClicks > 0 ? `+${fixed(row.potentialClicks, 1)}` : '—'}</td>
    <td>${queryDetails(row.queries)}</td>
  </tr>`).join('');

  host.innerHTML = `<div class="seo-table-wrap"><table class="seo-table seo-table--work"><thead><tr>
    <th>Priority</th><th>Recommended action</th><th>Page</th><th>Signals</th><th>Impressions</th><th>Clicks</th><th>Position</th><th>Est. extra clicks</th><th>Queries</th>
  </tr></thead><tbody>${body}</tbody></table></div>`;
}

function priorityBand(value) {
  if (value >= 75) return 'high';
  if (value >= 50) return 'medium';
  return 'normal';
}

function renderLegacyTable(rows) {
  const section = el.sections.legacy;
  const host = el.tables.legacy;
  if (!section || !host) return;
  section.hidden = rows.length === 0;
  setText(el.counts.legacy, number(rows.length));
  if (!rows.length) {
    host.innerHTML = '';
    return;
  }

  const body = rows.map((row) => `<tr>
    <td>${pageLink(row.page, row.pagePath)}</td>
    <td>${escapeHtml(row.legacyType)}</td>
    <td data-number>${number(row.current.impressions)}</td>
    <td data-number>${number(row.current.clicks)}</td>
    <td data-number>${fixed(row.current.position, 1)}</td>
    <td>${queryDetails(row.queries || [])}</td>
    <td><strong>${escapeHtml(row.action)}</strong><small class="seo-action-detail">Check redirect/canonical behaviour before changing the legacy route.</small></td>
  </tr>`).join('');

  host.innerHTML = `<div class="seo-table-wrap"><table class="seo-table"><thead><tr>
    <th>Legacy page</th><th>Pattern</th><th>Impressions</th><th>Clicks</th><th>Position</th><th>Queries</th><th>Recommended action</th>
  </tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderQueryGroupTable(type, rows, mode) {
  const section = el.sections[type];
  const host = el.tables[type];
  if (!section || !host) return;
  const groups = groupQueryRows(rows);
  section.hidden = false;
  setText(el.counts[type], number(groups.length));

  if (!groups.length) {
    host.innerHTML = '<p class="seo-empty">No material opportunities were found for this period using the current thresholds.</p>';
    return;
  }

  const action = mode === 'ctr' ? 'Improve search snippet' : 'Strengthen relevance / CTR';
  const body = groups.map((group) => `<tr>
    <td>${pageLink(group.page, group.pagePath)}</td>
    <td data-number>${number(group.queries.length)}</td>
    <td data-number>${number(group.impressions)}</td>
    <td data-number>${number(group.clicks)}</td>
    <td data-number>${fixed(group.position, 1)}</td>
    <td data-number>${fixed(group.ctrPercent, 2)}%</td>
    <td data-number>${group.potentialClicks > 0 ? `+${fixed(group.potentialClicks, 1)}` : '—'}</td>
    <td>${queryDetails(group.queries)}</td>
    <td><strong>${action}</strong></td>
  </tr>`).join('');

  host.innerHTML = `<div class="seo-table-wrap"><table class="seo-table"><thead><tr>
    <th>Page</th><th>Queries</th><th>Query impressions</th><th>Clicks</th><th>Avg. position</th><th>CTR</th><th>Est. extra clicks</th><th>Query detail</th><th>Action</th>
  </tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderTrendTable(type, rows, actionLabel) {
  const section = el.sections[type];
  const host = el.tables[type];
  if (!section || !host) return;
  section.hidden = false;
  setText(el.counts[type], number(rows.length));

  if (!rows.length) {
    host.innerHTML = '<p class="seo-empty">No material page-level change was found for this period using the current thresholds.</p>';
    return;
  }

  const body = rows.map((row) => `<tr>
    <td>${pageLink(row.page, row.pagePath)}</td>
    <td data-number>${number(row.current.clicks)}</td>
    <td data-number>${signedPercent(row.clicksChangePercent)}</td>
    <td data-number>${number(row.current.impressions)}</td>
    <td data-number>${signedPercent(row.impressionsChangePercent)}</td>
    <td data-number>${fixed(row.current.position, 1)}</td>
    <td data-number>${signed(row.positionChange, 1)}</td>
    <td><strong>${escapeHtml(actionLabel)}</strong></td>
  </tr>`).join('');

  host.innerHTML = `<div class="seo-table-wrap"><table class="seo-table"><thead><tr>
    <th>Page</th><th>Clicks</th><th>Click change</th><th>Impressions</th><th>Impression change</th><th>Position</th><th>Position gain</th><th>Action</th>
  </tr></thead><tbody>${body}</tbody></table></div>`;
}

function pageLink(url, label) {
  const safeUrl = safeHttpUrl(url);
  const safeLabel = escapeHtml(label || url || 'Page');
  if (!safeUrl) return safeLabel;
  return `<a class="seo-page-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function number(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-GB');
}

function fixed(value, digits) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : '—';
}

function signedPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
}

function signed(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(digits)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const report = state.report;
  if (!report) return;

  const lines = [['Section', 'Recommended action', 'Page', 'Query/detail', 'Clicks', 'Impressions', 'CTR %', 'Position', 'Estimated extra clicks', 'Priority/change']];
  (report.opportunities?.workQueue || []).forEach((row) => lines.push([
    'SEO work queue', row.action?.label, row.page, (row.queries || []).map((query) => query.query).join(' | '), row.clicks, row.impressions, row.ctrPercent, row.position, row.potentialClicks, row.priority,
  ]));
  (report.opportunities?.legacy || []).forEach((row) => lines.push([
    'Legacy URL', row.action, row.page, row.legacyType, row.current?.clicks, row.current?.impressions, row.current?.ctrPercent, row.current?.position, '', row.score,
  ]));
  (report.opportunities?.mixed || []).forEach((row) => lines.push([
    'Mixed movement', 'Review mixed movement', row.page, '', row.current?.clicks, row.current?.impressions, row.current?.ctrPercent, row.current?.position, '', `${row.clicksChangePercent}% clicks / ${row.impressionsChangePercent}% impressions`,
  ]));
  (report.opportunities?.declines || []).forEach((row) => lines.push([
    'Declining page', 'Investigate decline', row.page, '', row.current?.clicks, row.current?.impressions, row.current?.ctrPercent, row.current?.position, '', row.impressionsChangePercent,
  ]));
  (report.opportunities?.growth || []).forEach((row) => lines.push([
    'Growing page', 'Protect and expand', row.page, '', row.current?.clicks, row.current?.impressions, row.current?.ctrPercent, row.current?.position, '', row.impressionsChangePercent,
  ]));

  const csv = lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ccg-search-console-opportunities-${report.periods?.current?.end || 'report'}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
