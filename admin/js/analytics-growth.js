import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const SEARCH_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const SEARCH_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';
const ANALYTICS_ADMIN_ENDPOINT = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries';
const ANALYTICS_DATA_ENDPOINT = 'https://analyticsdata.googleapis.com/v1beta';
const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const MAX_SEARCH_ROWS = 5000;
const MEMBER_PAGE_SIZE = 500;

const state = {
  loading: false,
  authorizing: false,
  config: null,
  tokenClient: null,
  googleAccessToken: '',
  googleTokenExpiresAt: 0,
  grantedScopes: new Set(),
  googleLibraryPromise: null,
  properties: [],
  selectedProperty: '',
  members: [],
  search: null,
  analytics: null,
};

const el = {
  days: document.querySelector('[data-growth-days]'),
  property: document.querySelector('[data-growth-property]'),
  connect: document.querySelector('[data-growth-connect]'),
  refresh: document.querySelector('[data-growth-refresh]'),
  status: document.querySelector('[data-growth-status]'),
  verdict: document.querySelector('[data-growth-verdict]'),
  stats: Object.fromEntries(Array.from(document.querySelectorAll('[data-growth-stat]')).map((node) => [node.dataset.growthStat, node])),
  changes: Object.fromEntries(Array.from(document.querySelectorAll('[data-growth-change]')).map((node) => [node.dataset.growthChange, node])),
  memberStats: Object.fromEntries(Array.from(document.querySelectorAll('[data-member-stat]')).map((node) => [node.dataset.memberStat, node])),
  audienceStats: Object.fromEntries(Array.from(document.querySelectorAll('[data-audience-stat]')).map((node) => [node.dataset.audienceStat, node])),
  memberNote: document.querySelector('[data-member-note]'),
  youtubeInSummary: document.querySelector('[data-youtube-in-summary]'),
  youtubeOutSummary: document.querySelector('[data-youtube-out-summary]'),
  sections: Object.fromEntries(Array.from(document.querySelectorAll('[data-growth-section]')).map((node) => [node.dataset.growthSection, node])),
  counts: Object.fromEntries(Array.from(document.querySelectorAll('[data-growth-count]')).map((node) => [node.dataset.growthCount, node])),
  tables: Object.fromEntries(Array.from(document.querySelectorAll('[data-growth-table]')).map((node) => [node.dataset.growthTable, node])),
};

init();

async function init() {
  const access = await ensureRole(['admin', 'superadmin']);
  if (!access) return;
  await startAccessMonitor();
  await initAdminNav({ pageLabel: 'Analytics & Growth', active: 'analytics' });

  el.connect?.addEventListener('click', handleConnect);
  el.refresh?.addEventListener('click', handleRefresh);
  el.days?.addEventListener('change', handlePeriodChange);
  el.property?.addEventListener('change', handlePropertyChange);

  await Promise.allSettled([loadMembers(), loadConnectionConfig()]);
  renderImpact();
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    throw new Error('Supabase client bootstrap is unavailable on this page.');
  }
  return window.ccgSupabase.getClient();
}

async function loadMembers() {
  const supabase = await getSupabaseClient();
  const members = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.rpc('admin_list_members', {
      p_banned: null,
      p_limit: MEMBER_PAGE_SIZE,
      p_offset: offset,
      p_role: null,
      p_search: null,
    });
    if (error) throw new Error(`Member totals could not be loaded: ${error.message}`);

    const page = Array.isArray(data) ? data : [];
    members.push(...page);
    if (page.length < MEMBER_PAGE_SIZE) break;
    offset += MEMBER_PAGE_SIZE;
    if (offset >= 50000) throw new Error('Member pagination safety limit reached.');
  }

  state.members = members;
  renderMembers();
}

function renderMembers() {
  const now = Date.now();
  const countSince = (days) => state.members.filter((member) => {
    const stamp = new Date(member.signup_date || 0).getTime();
    return Number.isFinite(stamp) && stamp >= now - days * 86400000;
  }).length;

  setText(el.memberStats.total, formatNumber(state.members.length));
  setText(el.memberStats.day, formatNumber(countSince(1)));
  setText(el.memberStats.week, formatNumber(countSince(7)));
  setText(el.memberStats.month, formatNumber(countSince(30)));

  const current = memberPeriodCounts();
  setText(el.stats.registrations, formatNumber(current.current));
  setText(el.memberNote, `${formatNumber(current.current)} account${current.current === 1 ? '' : 's'} registered in the selected ${current.days}-day window; ${formatNumber(current.previous)} in the previous ${current.days} days.`);
  renderImpact();
}

function memberPeriodCounts() {
  const days = selectedDays();
  const now = Date.now();
  const currentStart = now - days * 86400000;
  const previousStart = currentStart - days * 86400000;
  let current = 0;
  let previous = 0;

  state.members.forEach((member) => {
    const stamp = new Date(member.signup_date || 0).getTime();
    if (!Number.isFinite(stamp)) return;
    if (stamp >= currentStart && stamp <= now) current += 1;
    else if (stamp >= previousStart && stamp < currentStart) previous += 1;
  });

  return { days, current, previous };
}

async function loadConnectionConfig() {
  setStatus('Registration totals are available. Checking the existing Google OAuth configuration…', 'loading');
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('search-console-opportunities', {
      body: { action: 'config' },
    });
    if (error) throw new Error(error.message || 'Google configuration request failed.');
    if (!data?.success) throw new Error(data?.error || 'Google configuration was not returned.');

    state.config = data;
    if (!data.configured) {
      const missing = Array.isArray(data.missing) ? data.missing.join(', ') : 'Search Console OAuth settings';
      setStatus(`Registration totals are loaded. Google reporting needs configuration: ${missing}.`, 'error');
      return;
    }

    await loadGoogleIdentityServices();
    configureGoogleTokenClient(data.oauthClientId);
    setStatus('Registration totals are loaded. Connect Google Data for GA4 traffic, page, YouTube and Search Console discovery reporting.', 'ok');
  } catch (error) {
    setStatus(`Registration totals are available, but Google reporting setup could not be checked: ${error.message || error}`, 'error');
  }
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (state.googleLibraryPromise) return state.googleLibraryPromise;

  state.googleLibraryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'));
    document.head.appendChild(script);
  });
  return state.googleLibraryPromise;
}

function configureGoogleTokenClient(clientId) {
  if (!window.google?.accounts?.oauth2?.initTokenClient) throw new Error('Google OAuth is unavailable.');
  state.tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: String(clientId || '').trim(),
    scope: `${SEARCH_SCOPE} ${ANALYTICS_SCOPE}`,
    callback: handleGoogleTokenResponse,
    error_callback: handleGooglePopupError,
  });
}

function handleConnect() {
  if (state.loading || state.authorizing) return;
  if (hasValidGoogleToken()) {
    void loadGoogleReports();
    return;
  }
  if (!state.tokenClient) {
    setStatus('Google OAuth is not ready yet.', 'error');
    return;
  }

  state.authorizing = true;
  updateControls();
  setStatus('Waiting for temporary read-only Google Analytics and Search Console permission…', 'loading');
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

  const token = String(response?.access_token || '').trim();
  if (!token) {
    setStatus('Google did not return an access token.', 'error');
    return;
  }

  state.googleAccessToken = token;
  state.googleTokenExpiresAt = Date.now() + Math.max(60, Number(response?.expires_in) || 3600) * 1000;
  state.grantedScopes = new Set(String(response?.scope || '').split(/\s+/).filter(Boolean));
  updateControls();
  void loadGoogleReports();
}

function handleGooglePopupError(error) {
  state.authorizing = false;
  updateControls();
  const type = String(error?.type || 'unknown');
  setStatus(type === 'popup_closed' ? 'Google authorization was closed. No Google data was accessed.' : 'Google authorization could not be completed.', type === 'popup_closed' ? 'ok' : 'error');
}

function hasValidGoogleToken() {
  return Boolean(state.googleAccessToken) && state.googleTokenExpiresAt - Date.now() > 60000;
}

function clearGoogleToken() {
  state.googleAccessToken = '';
  state.googleTokenExpiresAt = 0;
  state.grantedScopes = new Set();
}

function hasScope(scope) {
  if (state.grantedScopes.size === 0) return true;
  return state.grantedScopes.has(scope);
}

async function googleFetch(url, options = {}) {
  if (!hasValidGoogleToken()) throw new Error('Google authorization has expired. Connect again.');
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${state.googleAccessToken}`);
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });
  if (response.status === 401) {
    clearGoogleToken();
    updateControls();
    throw new Error('Google authorization has expired. Connect again.');
  }
  return response;
}

async function loadGoogleReports() {
  if (state.loading) return;
  state.loading = true;
  updateControls();
  setStatus('Loading Google Analytics and Search Console data…', 'loading');

  const outcomes = [];
  try {
    if (hasScope(SEARCH_SCOPE)) {
      try {
        await loadSearchConsole();
        outcomes.push('Search Console loaded');
      } catch (error) {
        outcomes.push(`Search Console unavailable: ${error.message || error}`);
        state.search = null;
        clearSection('discovered');
      }
    }

    if (hasScope(ANALYTICS_SCOPE)) {
      try {
        await loadAnalyticsProperties();
        if (state.selectedProperty) {
          await loadAnalytics();
          outcomes.push('GA4 loaded');
        } else {
          outcomes.push('No accessible GA4 property found');
        }
      } catch (error) {
        outcomes.push(`GA4 unavailable: ${error.message || error}`);
        state.analytics = null;
        clearAnalyticsSections();
      }
    }

    renderImpact();
    setStatus(outcomes.join(' · ') || 'No Google reporting scope was granted.', outcomes.some((item) => item.includes('loaded')) ? 'ok' : 'error');
  } finally {
    state.loading = false;
    updateControls();
  }
}

async function loadSearchConsole() {
  const siteUrl = String(state.config?.siteUrl || '').trim();
  if (!siteUrl) throw new Error('Search Console site URL is missing.');
  await verifySearchConsoleAccess(siteUrl);

  const periods = searchPeriods(selectedDays());
  const [currentTotalsRows, previousTotalsRows, queryPageRows, currentPages, previousPages] = await Promise.all([
    querySearchConsole(siteUrl, periods.current, [], 1),
    querySearchConsole(siteUrl, periods.previous, [], 1),
    querySearchConsole(siteUrl, periods.current, ['query', 'page'], MAX_SEARCH_ROWS),
    querySearchConsole(siteUrl, periods.current, ['page'], MAX_SEARCH_ROWS),
    querySearchConsole(siteUrl, periods.previous, ['page'], MAX_SEARCH_ROWS),
  ]);

  const currentTotals = searchMetric(currentTotalsRows[0]);
  const previousTotals = searchMetric(previousTotalsRows[0]);
  const discovered = buildDiscoveredPages(currentPages, previousPages, queryPageRows);

  state.search = { periods, currentTotals, previousTotals, discovered };
  setText(el.stats.searchClicks, formatNumber(currentTotals.clicks));
  setChange(el.changes.searchClicks, percentageChange(currentTotals.clicks, previousTotals.clicks), 'vs previous period');
  renderDiscovered(discovered);
}

async function verifySearchConsoleAccess(siteUrl) {
  const response = await googleFetch(SEARCH_ENDPOINT);
  if (!response.ok) throw new Error(`property access check failed (${response.status})`);
  const payload = await response.json().catch(() => ({}));
  const entries = Array.isArray(payload?.siteEntry) ? payload.siteEntry : [];
  if (!entries.some((entry) => String(entry?.siteUrl || '') === siteUrl)) throw new Error('selected Google account cannot access the configured CCG property');
}

async function querySearchConsole(siteUrl, range, dimensions, rowLimit) {
  const response = await googleFetch(`${SEARCH_ENDPOINT}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: range.start,
      endDate: range.end,
      dimensions,
      type: 'web',
      aggregationType: 'auto',
      rowLimit,
      dataState: 'final',
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`query failed (${response.status})${detail ? `: ${detail.slice(0, 140)}` : ''}`);
  }
  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.rows) ? payload.rows : [];
}

function buildDiscoveredPages(currentRows, previousRows, queryPageRows) {
  const previous = new Map(previousRows.map((row) => [String(row?.keys?.[0] || ''), searchMetric(row)]));
  const topQuery = new Map();
  queryPageRows.forEach((row) => {
    const query = String(row?.keys?.[0] || '').trim();
    const page = String(row?.keys?.[1] || '').trim();
    const metrics = searchMetric(row);
    if (!query || !page) return;
    const existing = topQuery.get(page);
    if (!existing || metrics.impressions > existing.impressions) topQuery.set(page, { query, ...metrics });
  });

  return currentRows
    .map((row) => {
      const page = String(row?.keys?.[0] || '').trim();
      const current = searchMetric(row);
      const before = previous.get(page) || searchMetric();
      return { page, pagePath: normalizePage(page), current, previous: before, topQuery: topQuery.get(page)?.query || '—' };
    })
    .filter((row) => row.page && row.current.impressions > 0 && row.previous.impressions === 0)
    .sort((a, b) => b.current.impressions - a.current.impressions || b.current.clicks - a.current.clicks)
    .slice(0, 50);
}

async function loadAnalyticsProperties() {
  const properties = [];
  let pageToken = '';
  do {
    const url = new URL(ANALYTICS_ADMIN_ENDPOINT);
    url.searchParams.set('pageSize', '200');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await googleFetch(url.toString());
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`property list failed (${response.status})${detail ? `: ${detail.slice(0, 140)}` : ''}. Ensure the Google Analytics Admin API is enabled.`);
    }
    const payload = await response.json().catch(() => ({}));
    (payload.accountSummaries || []).forEach((account) => {
      (account.propertySummaries || []).forEach((property) => {
        if (property?.property) properties.push({ id: property.property, name: property.displayName || property.property, account: account.displayName || '' });
      });
    });
    pageToken = String(payload.nextPageToken || '');
  } while (pageToken);

  state.properties = properties.sort((a, b) => a.name.localeCompare(b.name));
  if (!state.properties.length) {
    state.selectedProperty = '';
    renderPropertySelect();
    return;
  }

  const stillValid = state.properties.some((property) => property.id === state.selectedProperty);
  if (!stillValid) {
    const likely = state.properties.find((property) => /cheeky|commodore|ccg/i.test(`${property.name} ${property.account}`));
    state.selectedProperty = (likely || state.properties[0]).id;
  }
  renderPropertySelect();
}

function renderPropertySelect() {
  if (!el.property) return;
  if (!state.properties.length) {
    el.property.innerHTML = '<option value="">No accessible GA4 property</option>';
    el.property.disabled = true;
    return;
  }
  el.property.innerHTML = state.properties.map((property) => `<option value="${escapeHtml(property.id)}"${property.id === state.selectedProperty ? ' selected' : ''}>${escapeHtml(property.name)}${property.account ? ` — ${escapeHtml(property.account)}` : ''}</option>`).join('');
  el.property.disabled = false;
}

async function handlePropertyChange() {
  state.selectedProperty = String(el.property?.value || '');
  if (hasValidGoogleToken() && state.selectedProperty) {
    state.loading = true;
    updateControls();
    try {
      await loadAnalytics();
      renderImpact();
      setStatus('GA4 property changed and report refreshed.', 'ok');
    } catch (error) {
      setStatus(`GA4 report could not be loaded: ${error.message || error}`, 'error');
    } finally {
      state.loading = false;
      updateControls();
    }
  }
}

async function loadAnalytics() {
  const periods = analyticsPeriods(selectedDays());
  const [summaryRows, previousSummaryRows, audienceRows, pageRows, sourceRows, youtubeRows, signupRows] = await Promise.all([
    runGaReport({ dateRanges: [periods.current], metrics: ['activeUsers', 'sessions', 'newUsers', 'screenPageViews', 'averageSessionDuration', 'engagementRate'] }),
    runGaReport({ dateRanges: [periods.previous], metrics: ['activeUsers', 'sessions', 'newUsers', 'screenPageViews', 'averageSessionDuration', 'engagementRate'] }),
    runGaReport({ dateRanges: [periods.current], dimensions: ['newVsReturning'], metrics: ['activeUsers'], limit: 10 }),
    runGaReport({ dateRanges: [periods.current], dimensions: ['pagePath', 'pageTitle'], metrics: ['screenPageViews', 'activeUsers'], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 500 }),
    runGaReport({ dateRanges: [periods.current], dimensions: ['sessionSource', 'sessionMedium', 'sessionDefaultChannelGroup'], metrics: ['sessions', 'activeUsers'], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 250 }),
    runGaReport({ dateRanges: [periods.current], dimensions: ['pagePath', 'linkUrl', 'linkDomain'], metrics: ['eventCount'], dimensionFilter: exactFilter('eventName', 'click'), orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 250 }),
    runGaReport({ dateRanges: [periods.current], dimensions: ['sessionSource', 'sessionMedium'], metrics: ['eventCount'], dimensionFilter: exactFilter('eventName', 'sign_up'), orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 100 }),
  ]);

  const summary = parseSingleMetricRow(summaryRows);
  const previousSummary = parseSingleMetricRow(previousSummaryRows);
  const audience = parseAudience(audienceRows);
  const pages = parseRows(pageRows);
  const sources = parseRows(sourceRows);
  const youtubeOutbound = parseRows(youtubeRows).filter((row) => isYouTubeLink(row.linkDomain, row.linkUrl));
  const signups = parseRows(signupRows);
  const games = pages.filter((row) => isGameDetailPath(row.pagePath)).slice(0, 50);
  const youtubeInbound = sources.filter((row) => isYouTubeSource(row.sessionSource, row.sessionMedium));

  state.analytics = { periods, summary, previousSummary, audience, pages, games, sources, youtubeInbound, youtubeOutbound, signups };
  renderAnalytics();
}

async function runGaReport({ dateRanges, dimensions = [], metrics = [], orderBys = [], dimensionFilter = null, limit = 100 }) {
  const propertyId = String(state.selectedProperty || '').replace(/^properties\//, '');
  if (!propertyId) throw new Error('No GA4 property is selected.');
  const body = {
    dateRanges,
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    orderBys,
    limit: String(limit),
    keepEmptyRows: false,
  };
  if (dimensionFilter) body.dimensionFilter = dimensionFilter;

  const response = await googleFetch(`${ANALYTICS_DATA_ENDPOINT}/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Data API report failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}. Ensure the Google Analytics Data API is enabled.`);
  }
  return response.json();
}

function exactFilter(fieldName, value) {
  return { filter: { fieldName, stringFilter: { matchType: 'EXACT', value, caseSensitive: true } } };
}

function parseRows(report) {
  const dimensions = (report?.dimensionHeaders || []).map((header) => header.name);
  const metrics = (report?.metricHeaders || []).map((header) => header.name);
  return (report?.rows || []).map((row) => {
    const item = {};
    dimensions.forEach((name, index) => { item[name] = row.dimensionValues?.[index]?.value || ''; });
    metrics.forEach((name, index) => { item[name] = Number(row.metricValues?.[index]?.value || 0); });
    return item;
  });
}

function parseSingleMetricRow(report) {
  return parseRows(report)[0] || {};
}

function parseAudience(report) {
  const result = { new: 0, returning: 0 };
  parseRows(report).forEach((row) => {
    const key = String(row.newVsReturning || '').toLowerCase();
    if (key === 'new') result.new += Number(row.activeUsers || 0);
    if (key === 'returning') result.returning += Number(row.activeUsers || 0);
  });
  return result;
}

function renderAnalytics() {
  const report = state.analytics;
  if (!report) return;

  setText(el.stats.activeUsers, formatNumber(report.summary.activeUsers));
  setText(el.stats.sessions, formatNumber(report.summary.sessions));
  setChange(el.changes.activeUsers, percentageChange(report.summary.activeUsers, report.previousSummary.activeUsers), 'vs previous period');
  setChange(el.changes.sessions, percentageChange(report.summary.sessions, report.previousSummary.sessions), 'vs previous period');

  const youtubeIn = sum(report.youtubeInbound, 'sessions');
  const youtubeOut = sum(report.youtubeOutbound, 'eventCount');
  setText(el.stats.youtubeInbound, formatNumber(youtubeIn));
  setText(el.stats.youtubeOutbound, formatNumber(youtubeOut));

  setText(el.audienceStats.new, formatNumber(report.audience.new));
  setText(el.audienceStats.returning, formatNumber(report.audience.returning));
  setText(el.audienceStats.duration, formatDuration(report.summary.averageSessionDuration));
  setText(el.audienceStats.engagement, `${round(Number(report.summary.engagementRate || 0) * 100, 1)}%`);
  if (el.sections.audience) el.sections.audience.hidden = false;

  renderGames(report.games);
  renderContent(report.pages.slice(0, 75));
  renderSources(report.sources);
  renderYoutubeInbound(report.youtubeInbound);
  renderYoutubeOutbound(report.youtubeOutbound);
  renderSignups(report.signups);
  renderImpact();
}

function renderDiscovered(rows) {
  renderTableSection('discovered', rows, ['Page', 'Top query', 'Impressions', 'Clicks', 'Position'], (row) => [
    pageLink(row.pagePath),
    escapeHtml(row.topQuery),
    numberCell(row.current.impressions),
    numberCell(row.current.clicks),
    numberCell(round(row.current.position, 1)),
  ]);
}

function renderGames(rows) {
  renderTableSection('games', rows, ['Game page', 'Views', 'Active users'], (row) => [
    pageLink(row.pagePath, row.pageTitle),
    numberCell(row.screenPageViews),
    numberCell(row.activeUsers),
  ]);
}

function renderContent(rows) {
  renderTableSection('content', rows, ['Page', 'Views', 'Active users'], (row) => [
    pageLink(row.pagePath, row.pageTitle),
    numberCell(row.screenPageViews),
    numberCell(row.activeUsers),
  ]);
}

function renderSources(rows) {
  renderTableSection('sources', rows, ['Source', 'Medium', 'Channel', 'Sessions', 'Active users'], (row) => [
    escapeHtml(row.sessionSource || '—'),
    escapeHtml(row.sessionMedium || '—'),
    escapeHtml(row.sessionDefaultChannelGroup || '—'),
    numberCell(row.sessions),
    numberCell(row.activeUsers),
  ]);
}

function renderYoutubeInbound(rows) {
  const sessions = sum(rows, 'sessions');
  setText(el.youtubeInSummary, rows.length ? `${formatNumber(sessions)} identifiable tracked session${sessions === 1 ? '' : 's'} arrived from YouTube in this period.` : 'No identifiable YouTube referral sessions were reported in this period. Direct/app traffic can still hide some YouTube-origin visits.');
  renderSimpleTable('youtubeInbound', rows.slice(0, 25), ['Source', 'Medium', 'Sessions'], (row) => [escapeHtml(row.sessionSource || '—'), escapeHtml(row.sessionMedium || '—'), numberCell(row.sessions)]);
}

function renderYoutubeOutbound(rows) {
  const clicks = sum(rows, 'eventCount');
  setText(el.youtubeOutSummary, rows.length ? `${formatNumber(clicks)} tracked website-to-YouTube click${clicks === 1 ? '' : 's'} in this period.` : 'No tracked website-to-YouTube outbound clicks were reported in this period. Confirm GA4 Enhanced Measurement outbound clicks are enabled if this remains empty.');
  renderSimpleTable('youtubeOutbound', rows.slice(0, 25), ['From page', 'YouTube destination', 'Clicks'], (row) => [pageLink(row.pagePath), externalLink(row.linkUrl), numberCell(row.eventCount)]);
}

function renderSignups(rows) {
  renderTableSection('signups', rows, ['Source', 'Medium', 'Tracked sign-ups'], (row) => [
    escapeHtml(row.sessionSource || '—'),
    escapeHtml(row.sessionMedium || '—'),
    numberCell(row.eventCount),
  ]);
}

function renderTableSection(name, rows, headers, mapper) {
  const section = el.sections[name];
  const count = el.counts[name];
  if (count) count.textContent = formatNumber(rows.length);
  if (section) section.hidden = false;
  renderSimpleTable(name, rows, headers, mapper);
}

function renderSimpleTable(name, rows, headers, mapper) {
  const host = el.tables[name];
  if (!host) return;
  if (!rows.length) {
    host.innerHTML = '<p class="growth-empty">No matching data in this reporting window.</p>';
    return;
  }

  host.innerHTML = `<div class="growth-table-wrap"><table class="growth-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${mapper(row).map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderImpact() {
  const memberCounts = memberPeriodCounts();
  if (state.members.length) setText(el.stats.registrations, formatNumber(memberCounts.current));

  if (!el.verdict) return;
  const searchClicks = Number(state.search?.currentTotals?.clicks || 0);
  const sessions = Number(state.analytics?.summary?.sessions || 0);
  const returning = Number(state.analytics?.audience?.returning || 0);
  const youtubeIn = sum(state.analytics?.youtubeInbound || [], 'sessions');
  const youtubeOut = sum(state.analytics?.youtubeOutbound || [], 'eventCount');
  const registrations = memberCounts.current;
  const available = Boolean(state.search || state.analytics || state.members.length);
  const signals = [searchClicks > 0, sessions > 0, returning > 0, youtubeIn > 0, youtubeOut > 0, registrations > 0].filter(Boolean).length;

  if (!available) {
    el.verdict.dataset.state = 'developing';
    el.verdict.innerHTML = '<strong>Not enough data yet</strong><p>The dashboard needs registration and/or Google reporting data before it can assess contribution.</p>';
    return;
  }

  if (signals >= 4) {
    el.verdict.dataset.state = 'positive';
    el.verdict.innerHTML = `<strong>Positive contribution detected</strong><p>${signals} of 6 contribution signals are active in this window: search discovery, tracked usage, returning visitors, YouTube inbound, YouTube outbound and registrations. This is evidence that the website is doing more than simply hosting pages.</p>`;
  } else if (signals >= 2) {
    el.verdict.dataset.state = 'developing';
    el.verdict.innerHTML = `<strong>Contribution is developing</strong><p>${signals} of 6 contribution signals are active in this window. Keep watching which pages gain Google visibility and whether YouTube crossover and registrations increase.</p>`;
  } else {
    el.verdict.dataset.state = 'developing';
    el.verdict.innerHTML = '<strong>Insufficient evidence of contribution in this window</strong><p>There is not yet enough tracked crossover, search traffic or registration activity to call the website a strong acquisition channel. A longer reporting window may be more informative.</p>';
  }
}

function clearAnalyticsSections() {
  ['games', 'content', 'sources', 'signups', 'audience'].forEach(clearSection);
  renderSimpleTable('youtubeInbound', [], [], () => []);
  renderSimpleTable('youtubeOutbound', [], [], () => []);
}

function clearSection(name) {
  if (el.sections[name]) el.sections[name].hidden = true;
  if (el.counts[name]) el.counts[name].textContent = '0';
  if (el.tables[name]) el.tables[name].innerHTML = '';
}

function handleRefresh() {
  if (state.loading) return;
  renderMembers();
  if (hasValidGoogleToken()) void loadGoogleReports();
  else setStatus('Registration totals refreshed. Connect Google Data to refresh GA4 and Search Console.', 'ok');
}

function handlePeriodChange() {
  renderMembers();
  if (hasValidGoogleToken()) void loadGoogleReports();
  else renderImpact();
}

function selectedDays() {
  const days = Number(el.days?.value || 28);
  return [7, 28, 90].includes(days) ? days : 28;
}

function searchPeriods(days) {
  const today = utcDay(new Date());
  const currentEnd = addDays(today, -3);
  const currentStart = addDays(currentEnd, -(days - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return { current: { start: isoDate(currentStart), end: isoDate(currentEnd) }, previous: { start: isoDate(previousStart), end: isoDate(previousEnd) } };
}

function analyticsPeriods(days) {
  const today = utcDay(new Date());
  const currentEnd = addDays(today, -1);
  const currentStart = addDays(currentEnd, -(days - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return { current: { startDate: isoDate(currentStart), endDate: isoDate(currentEnd) }, previous: { startDate: isoDate(previousStart), endDate: isoDate(previousEnd) } };
}

function utcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function searchMetric(row = null) {
  return {
    clicks: Number(row?.clicks) || 0,
    impressions: Number(row?.impressions) || 0,
    ctr: Number(row?.ctr) || 0,
    position: Number(row?.position) || 0,
  };
}

function normalizePage(value) {
  const page = String(value || '').trim();
  try {
    const parsed = new URL(page);
    return parsed.origin === SITE_ORIGIN ? `${parsed.pathname}${parsed.search}` : page;
  } catch {
    return page;
  }
}

function isGameDetailPath(path) {
  return /^\/games\/[^/?#]+\/?$/i.test(String(path || '')) && !/^\/games\/(index(?:\.html)?|game\.html)\/?$/i.test(String(path || ''));
}

function isYouTubeSource(source, medium) {
  return /(^|\.)youtube\.com$|youtu\.be|youtube/i.test(`${source || ''} ${medium || ''}`);
}

function isYouTubeLink(domain, url) {
  return /(^|\.)youtube\.com$|youtu\.be|youtube/i.test(`${domain || ''} ${url || ''}`);
}

function sum(rows, key) {
  return (rows || []).reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function percentageChange(current, previous) {
  const now = Number(current || 0);
  const before = Number(previous || 0);
  if (before <= 0) return now > 0 ? 100 : null;
  return round(((now - before) / before) * 100, 1);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-GB');
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return minutes ? `${minutes}m ${String(remainder).padStart(2, '0')}s` : `${remainder}s`;
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function setChange(node, change, suffix) {
  if (!node) return;
  if (change === null || !Number.isFinite(change)) {
    node.textContent = 'No previous-period baseline';
    node.removeAttribute('data-direction');
    return;
  }
  const prefix = change > 0 ? '+' : '';
  node.textContent = `${prefix}${change}% ${suffix}`;
  node.dataset.direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
}

function setStatus(message, status = 'ok') {
  if (!el.status) return;
  el.status.textContent = message;
  el.status.dataset.state = status;
}

function updateControls() {
  if (el.connect) {
    el.connect.disabled = state.loading || state.authorizing || !state.config?.configured;
    el.connect.textContent = hasValidGoogleToken() ? 'Reload Google Data' : state.authorizing ? 'Connecting…' : 'Connect Google Data';
  }
  if (el.refresh) el.refresh.disabled = state.loading || state.authorizing;
  if (el.days) el.days.disabled = state.loading || state.authorizing;
  if (el.property) el.property.disabled = state.loading || state.authorizing || !state.properties.length;
}

function pageLink(path, label = '') {
  const href = String(path || '/');
  const text = String(label || href || '—');
  return `<a class="growth-page-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>${label && label !== href ? `<small class="growth-muted">${escapeHtml(href)}</small>` : ''}`;
}

function externalLink(url) {
  const href = String(url || '');
  if (!href) return '<span class="growth-muted">—</span>';
  return `<a class="growth-page-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(href)}</a>`;
}

function numberCell(value) {
  return `<span data-number>${formatNumber(value)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
