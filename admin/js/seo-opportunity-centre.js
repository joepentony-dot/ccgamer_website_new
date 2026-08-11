import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DEFAULT_SEARCH_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';
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
    const queryOpportunities = buildQueryOpportunities(queryRows);
    const pageTrends = buildPageTrends(currentPageRows, previousPageRows);

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
    if (parsed.origin !== 'https://www.cheekycommodoregamer.co.uk') return page;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return page;
  }
}

function buildQueryOpportunities(rows) {
  const parsed = rows.map((row) => {
    const query = String(row?.keys?.[0] || '').trim();
    const page = String(row?.keys?.[1] || '').trim();
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

function pageMap(rows) {
  const result = new Map();
  rows.forEach((row) => {
    const page = String(row?.keys?.[0] || '').trim();
    if (page) result.set(page, metric(row));
  });
  return result;
}

function buildPageTrends(currentRows, previousRows) {
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
  renderQueryTable('ranking', opportunities.ranking || [], false);
  renderQueryTable('ctr', opportunities.ctr || [], true);
  renderTrendTable('declines', opportunities.declines || []);
  renderTrendTable('growth', opportunities.growth || []);
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

function renderQueryTable(type, rows, showExpectedCtr) {
  const section = el.sections[type];
  const host = el.tables[type];
  if (!section || !host) return;
  section.hidden = false;
  setText(el.counts[type], number(rows.length));

  if (!rows.length) {
    host.innerHTML = '<p class="seo-empty">No material opportunities were found for this period using the current thresholds.</p>';
    return;
  }

  const head = showExpectedCtr
    ? '<th>Query</th><th>Page</th><th>Impressions</th><th>Clicks</th><th>Position</th><th>CTR</th><th>Expected</th><th>Opportunity</th>'
    : '<th>Query</th><th>Page</th><th>Impressions</th><th>Clicks</th><th>Position</th><th>CTR</th><th>Opportunity</th>';

  const body = rows.map((row) => {
    const expected = showExpectedCtr ? `<td data-number>${fixed(row.expectedCtrPercent, 1)}%</td>` : '';
    return `<tr>
      <td class="seo-query">${escapeHtml(row.query)}</td>
      <td>${pageLink(row.page, row.pagePath)}</td>
      <td data-number>${number(row.impressions)}</td>
      <td data-number>${number(row.clicks)}</td>
      <td data-number>${fixed(row.position, 1)}</td>
      <td data-number>${fixed(row.ctrPercent, 2)}%</td>
      ${expected}
      <td data-number>${number(row.score)}</td>
    </tr>`;
  }).join('');

  host.innerHTML = `<div class="seo-table-wrap"><table class="seo-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderTrendTable(type, rows) {
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
  </tr>`).join('');

  host.innerHTML = `<div class="seo-table-wrap"><table class="seo-table"><thead><tr>
    <th>Page</th><th>Clicks</th><th>Click change</th><th>Impressions</th><th>Impression change</th><th>Position</th><th>Position gain</th>
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

  const lines = [['Section', 'Query/Page', 'Page', 'Clicks', 'Impressions', 'CTR %', 'Position', 'Change/Score']];
  (report.opportunities?.ranking || []).forEach((row) => lines.push([
    'Ranking opportunity', row.query, row.page, row.clicks, row.impressions, row.ctrPercent, row.position, row.score,
  ]));
  (report.opportunities?.ctr || []).forEach((row) => lines.push([
    'CTR opportunity', row.query, row.page, row.clicks, row.impressions, row.ctrPercent, row.position, row.score,
  ]));
  (report.opportunities?.declines || []).forEach((row) => lines.push([
    'Declining page', row.pagePath, row.page, row.current?.clicks, row.current?.impressions, row.current?.ctrPercent, row.current?.position, row.impressionsChangePercent,
  ]));
  (report.opportunities?.growth || []).forEach((row) => lines.push([
    'Growing page', row.pagePath, row.page, row.current?.clicks, row.current?.impressions, row.current?.ctrPercent, row.current?.position, row.impressionsChangePercent,
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
