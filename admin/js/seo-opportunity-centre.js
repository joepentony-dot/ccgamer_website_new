import { ensureRole, startAccessMonitor } from './guard.js';
import { initAdminNav } from './admin-nav.js';

const state = {
  report: null,
  loading: false,
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

  el.refresh?.addEventListener('click', loadReport);
  el.days?.addEventListener('change', loadReport);
  el.export?.addEventListener('click', exportCsv);

  await loadReport();
}

async function getSupabaseClient() {
  if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') {
    throw new Error('Supabase client bootstrap is unavailable on this page.');
  }
  return window.ccgSupabase.getClient();
}

async function extractFunctionError(error) {
  if (!error) return { message: 'Unknown Search Console error.' };
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

async function loadReport() {
  if (state.loading) return;
  state.loading = true;
  setBusy(true);
  setStatus('Loading finalized Search Console data securely…', 'loading');

  try {
    const supabase = await getSupabaseClient();
    const days = Number(el.days?.value || 28);
    const { data, error } = await supabase.functions.invoke('search-console-opportunities', {
      body: { days },
    });

    if (error) {
      const detail = await extractFunctionError(error);
      const missing = Array.isArray(detail.missing) ? detail.missing.filter(Boolean) : [];
      if (detail.configured === false || missing.length) {
        setStatus(
          `Search Console is ready in the website but still needs its secure Supabase secrets${missing.length ? `: ${missing.join(', ')}` : ''}. No Search Console credentials are stored in this page or the public repository.`,
          'error',
        );
        clearReport();
        return;
      }
      throw new Error(detail.error || detail.message || error.message || 'Search Console request failed.');
    }

    if (!data?.success) throw new Error(data?.error || 'Search Console returned no report.');
    state.report = data;
    renderReport(data);

    const generated = new Date(data.generatedAt);
    const generatedText = Number.isNaN(generated.getTime()) ? 'just now' : generated.toLocaleString('en-GB');
    setStatus(
      `Search Console report loaded for ${data.periods.current.start} to ${data.periods.current.end}. Generated ${generatedText}. The API returned ${Number(data.limits?.queryPageRowsReturned || 0).toLocaleString('en-GB')} query/page rows; Google may omit lower-volume rows from this API.`,
      'ok',
    );
  } catch (error) {
    clearReport();
    setStatus(`Search Console report could not be loaded: ${error.message || error}`, 'error');
  } finally {
    state.loading = false;
    setBusy(false);
  }
}

function setBusy(busy) {
  if (el.refresh) {
    el.refresh.disabled = busy;
    el.refresh.textContent = busy ? 'Loading…' : 'Refresh Search Console';
  }
  if (el.days) el.days.disabled = busy;
  if (el.export) el.export.disabled = busy || !state.report;
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
