/* ============================================================
   CCG SEO Opportunity Centre — Managed Routes + Resolution Queue
============================================================ */
(function () {
  "use strict";

  const EVENT_TYPE = "seo_opportunity_resolution";
  const MONITOR_DAYS = 7;
  const MANAGED_ROUTES = new Map([
    ["/games/game.html", "Managed noindex,follow game handler"],
    ["/music/composer.html", "Managed noindex,follow composer handler"]
  ]);
  const resolutionState = { client: null, userId: "", loaded: false, items: new Map(), active: null, transitions: new Set() };

  function routeInfo(value) {
    try {
      const url = new URL(String(value || ""), window.location.origin);
      const label = MANAGED_ROUTES.get(url.pathname);
      return label ? { managed: true, label } : { managed: false };
    } catch { return { managed: false }; }
  }

  function setCount(name, value) {
    const count = document.querySelector(`[data-seo-count="${name}"]`);
    if (count) count.textContent = String(value);
  }

  function reconcileWorkQueue() {
    const host = document.querySelector('[data-seo-table="workQueue"]');
    if (!host?.querySelector("table")) return;
    const rows = Array.from(host.querySelectorAll("tbody tr"));
    let removed = 0;
    rows.forEach((row) => {
      const pageLink = row.cells?.[2]?.querySelector("a[href]");
      if (!pageLink || !routeInfo(pageLink.href).managed) return;
      row.remove();
      removed += 1;
    });
    if (!removed) return;
    const remaining = host.querySelectorAll("tbody tr").length;
    setCount("workQueue", remaining);
    if (!remaining) host.innerHTML = '<p class="seo-empty">No actionable work-queue items were found for this period. Managed noindex legacy routes remain available in the diagnostic section below.</p>';
  }

  function reconcileLegacyDiagnostics() {
    const host = document.querySelector('[data-seo-table="legacy"]');
    if (!host?.querySelector("table")) return;
    Array.from(host.querySelectorAll("tbody tr")).forEach((row) => {
      if (row.dataset.managedLegacy === "true") return;
      const link = row.cells?.[0]?.querySelector("a[href]");
      const info = link ? routeInfo(link.href) : { managed: false };
      if (!info.managed) return;
      row.dataset.managedLegacy = "true";
      if (row.cells?.[1]) row.cells[1].textContent = info.label;
      const actionCell = row.cells?.[row.cells.length - 1];
      if (actionCell) actionCell.innerHTML = '<strong>Monitor Google retirement</strong><small class="seo-action-detail">This compatibility route is intentionally retained with noindex,follow. Search Console impressions are not an SEO fault by themselves; investigate only if the canonical destination is wrong or impressions fail to decline over time.</small>';
    });
  }

  function hash(value) {
    let n = 2166136261;
    for (const ch of String(value || "")) { n ^= ch.charCodeAt(0); n = Math.imul(n, 16777619); }
    return (n >>> 0).toString(36);
  }

  function compact(value) { return String(value || "").replace(/\s+/g, " ").trim(); }

  function descriptor(row) {
    const link = row?.cells?.[2]?.querySelector("a[href]");
    const page = String(link?.href || "");
    const action = compact(row?.cells?.[1]?.querySelector("strong")?.textContent || row?.cells?.[1]?.textContent);
    if (!page || !action) return null;
    let path = page;
    try { const parsed = new URL(page); path = `${parsed.pathname}${parsed.search}`; } catch {}
    return {
      fingerprint: `seo-${hash(`${page}|${action.toLowerCase()}`)}`,
      page, path, action,
      detail: compact(row.cells[1]?.querySelector("small")?.textContent),
      signals: compact(row.cells[3]?.textContent),
      evidence: `${compact(row.cells[4]?.textContent)} impressions · ${compact(row.cells[5]?.textContent)} clicks · position ${compact(row.cells[6]?.textContent)} · est. extra clicks ${compact(row.cells[7]?.textContent)}`,
      queries: compact(row.cells[8]?.textContent)
    };
  }

  async function client() {
    if (resolutionState.client) return resolutionState.client;
    const started = Date.now();
    while (Date.now() - started < 8000) {
      if (window.ccgSupabase?.getClient) {
        resolutionState.client = await window.ccgSupabase.getClient();
        return resolutionState.client;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("Supabase admin client is unavailable.");
  }

  function message(text, state = "ok") {
    const section = document.querySelector('[data-seo-section="workQueue"]');
    if (!section) return;
    let node = section.querySelector("[data-seo-resolution-message]");
    if (!node) {
      node = document.createElement("p");
      node.className = "seo-resolution-message";
      node.dataset.seoResolutionMessage = "true";
      section.querySelector(".seo-centre__section-header")?.insertAdjacentElement("afterend", node);
    }
    node.textContent = text;
    node.dataset.state = state;
  }

  async function loadResolutions() {
    try {
      const supabase = await client();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      resolutionState.userId = String(auth?.user?.id || "");
      if (!resolutionState.userId) throw new Error("Administrator session is unavailable.");
      const { data, error } = await supabase.from("admin_activity_log").select("metadata,created_at").eq("event_type", EVENT_TYPE).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      resolutionState.items.clear();
      (data || []).forEach((row) => {
        const meta = row?.metadata || {};
        if (meta.fingerprint && !resolutionState.items.has(meta.fingerprint)) resolutionState.items.set(meta.fingerprint, { ...meta, created_at: row.created_at });
      });
      resolutionState.loaded = true;
      reconcile();
    } catch (error) {
      message(`Resolution controls could not load: ${error.message || error}`, "error");
    }
  }

  function fromSaved(saved) {
    return saved?.fingerprint ? { fingerprint: saved.fingerprint, page: saved.page_url, path: saved.page_path, action: saved.action_label, detail: saved.action_detail, signals: saved.signals, evidence: "", queries: "" } : null;
  }

  async function saveResolution(item, status, note = "", reason = "") {
    if (!item) return false;
    try {
      const supabase = await client();
      const now = new Date().toISOString();
      const metadata = {
        source: "seo-opportunity-centre", fingerprint: item.fingerprint, page_url: item.page, page_path: item.path,
        action_label: item.action, action_detail: item.detail, signals: item.signals, status, note: compact(note), recorded_at: now,
        comparison_days: Number(document.querySelector("[data-seo-days]")?.value || 28),
        monitor_until: status === "monitoring" ? new Date(Date.now() + MONITOR_DAYS * 86400000).toISOString() : null,
        transition_reason: compact(reason)
      };
      const { error } = await supabase.from("admin_activity_log").insert({ event_type: EVENT_TYPE, actor_user_id: resolutionState.userId, target_user_id: resolutionState.userId, metadata });
      if (error) throw error;
      resolutionState.items.set(item.fingerprint, { ...metadata, created_at: now });
      message(status === "monitoring" ? `Marked fixed and moved to monitoring for ${MONITOR_DAYS} days.` : status === "dismissed" ? "Dismissed as intentional / not actionable." : status === "resolved" ? "Confirmed resolved by the latest Search Console refresh." : "Reopened in the active SEO work queue.");
      reconcile();
      return true;
    } catch (error) {
      message(`Resolution could not be saved: ${error.message || error}`, "error");
      return false;
    }
  }

  function expired(saved) { const time = Date.parse(saved?.monitor_until || ""); return Number.isFinite(time) && time <= Date.now(); }

  function autoTransition(item, status, reason) {
    const key = `${item?.fingerprint}:${status}`;
    if (!item || resolutionState.transitions.has(key)) return;
    resolutionState.transitions.add(key);
    setTimeout(async () => { await saveResolution(item, status, resolutionState.items.get(item.fingerprint)?.note || "", reason); resolutionState.transitions.delete(key); }, 0);
  }

  function ensureDialog() {
    let dialog = document.querySelector("[data-seo-resolution-dialog]");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "seo-resolution-dialog";
    dialog.dataset.seoResolutionDialog = "true";
    dialog.innerHTML = `<form method="dialog" class="seo-resolution-dialog__panel"><header><div><small>CCG SEO WORKFLOW</small><h2>Resolve SEO opportunity</h2></div><button type="submit" class="seo-resolution-close" aria-label="Close">×</button></header><dl><div><dt>Page</dt><dd data-resolution-page></dd></div><div><dt>Recommended action</dt><dd data-resolution-action></dd></div><div><dt>Signals</dt><dd data-resolution-signals></dd></div><div><dt>Evidence</dt><dd data-resolution-evidence></dd></div><div><dt>Queries</dt><dd data-resolution-queries></dd></div></dl><label>Resolution note (optional)<textarea rows="3" data-resolution-note></textarea></label><div class="seo-resolution-links"><a class="ccg-btn ccg-btn--ghost" data-resolution-open target="_blank" rel="noopener noreferrer">Open live page</a><a class="ccg-btn ccg-btn--ghost" href="/admin/content-publisher.html" target="_blank" rel="noopener noreferrer">Open Content Publisher</a><button type="button" class="ccg-btn ccg-btn--ghost" data-resolution-copy>Copy recommendation</button></div><div class="seo-resolution-actions"><button type="button" class="ccg-btn ccg-btn--primary" data-resolution-monitor>Mark fixed &amp; monitor</button><button type="button" class="ccg-btn ccg-btn--ghost" data-resolution-dismiss>Dismiss / intentional</button></div></form>`;
    document.body.appendChild(dialog);
    dialog.querySelector("[data-resolution-monitor]").onclick = async () => { if (await saveResolution(resolutionState.active, "monitoring", dialog.querySelector("[data-resolution-note]").value)) dialog.close(); };
    dialog.querySelector("[data-resolution-dismiss]").onclick = async () => { if (await saveResolution(resolutionState.active, "dismissed", dialog.querySelector("[data-resolution-note]").value)) dialog.close(); };
    dialog.querySelector("[data-resolution-copy]").onclick = async () => {
      const item = resolutionState.active;
      try { await navigator.clipboard.writeText(`${item.action}: ${item.detail}\nPage: ${item.page}\nSignals: ${item.signals}\nQueries: ${item.queries}`); message("Recommendation copied to clipboard."); }
      catch { message("Clipboard access was unavailable.", "error"); }
    };
    return dialog;
  }

  function openDialog(item) {
    resolutionState.active = item;
    const dialog = ensureDialog();
    dialog.querySelector("[data-resolution-page]").textContent = item.path;
    dialog.querySelector("[data-resolution-action]").textContent = `${item.action}${item.detail ? ` — ${item.detail}` : ""}`;
    dialog.querySelector("[data-resolution-signals]").textContent = item.signals || "—";
    dialog.querySelector("[data-resolution-evidence]").textContent = item.evidence || "—";
    dialog.querySelector("[data-resolution-queries]").textContent = item.queries || "—";
    dialog.querySelector("[data-resolution-note]").value = resolutionState.items.get(item.fingerprint)?.note || "";
    dialog.querySelector("[data-resolution-open]").href = item.page;
    dialog.showModal ? dialog.showModal() : dialog.setAttribute("open", "");
  }

  function renderResolutionMonitor() {
    const work = document.querySelector('[data-seo-section="workQueue"]');
    if (!work) return;
    let section = document.querySelector("[data-seo-resolution-section]");
    if (!section) {
      section = document.createElement("section");
      section.className = "seo-centre__section seo-resolution-monitor";
      section.dataset.seoResolutionSection = "true";
      section.innerHTML = `<div class="seo-centre__section-header"><div><h2>SEO Resolution Monitor</h2><p>Fixed items wait ${MONITOR_DAYS} days for Search Console to catch up. They resolve automatically if the signal disappears, or reopen if it remains.</p></div><span class="seo-centre__count" data-resolution-count>0</span></div><div data-resolution-table></div>`;
      work.insertAdjacentElement("afterend", section);
    }
    const entries = Array.from(resolutionState.items.values()).filter((x) => ["monitoring", "dismissed", "resolved"].includes(x.status));
    section.querySelector("[data-resolution-count]").textContent = String(entries.length);
    const host = section.querySelector("[data-resolution-table]");
    if (!entries.length) { host.innerHTML = '<p class="seo-empty">No SEO opportunities are in monitoring or resolution history yet.</p>'; return; }
    const rows = entries.map((x) => `<tr><td><strong>${escapeHtml(x.status)}</strong></td><td><a class="seo-page-link" href="${escapeHtml(x.page_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(x.page_path || x.page_url)}</a></td><td>${escapeHtml(x.action_label)}</td><td>${escapeHtml(x.note || "—")}</td><td>${x.status === "monitoring" ? escapeHtml(new Date(x.monitor_until).toLocaleDateString("en-GB")) : "—"}</td><td><button type="button" class="ccg-btn ccg-btn--ghost seo-reopen" data-reopen="${escapeHtml(x.fingerprint)}">Reopen</button></td></tr>`).join("");
    host.innerHTML = `<div class="seo-table-wrap"><table class="seo-table"><thead><tr><th>Status</th><th>Page</th><th>Issue</th><th>Note</th><th>Next check</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    host.querySelectorAll("[data-reopen]").forEach((button) => { button.onclick = () => saveResolution(fromSaved(resolutionState.items.get(button.dataset.reopen)), "open", resolutionState.items.get(button.dataset.reopen)?.note || "", "Reopened manually by administrator."); });
  }

  function addResolutionControls() {
    const table = document.querySelector('[data-seo-table="workQueue"] table');
    if (!table) return;
    const head = table.querySelector("thead tr");
    if (head && !head.querySelector("[data-resolve-heading]")) { const th = document.createElement("th"); th.dataset.resolveHeading = "true"; th.textContent = "Resolve"; head.appendChild(th); }
    const current = new Set();
    table.querySelectorAll("tbody tr").forEach((row) => {
      const item = descriptor(row); if (!item) return; current.add(item.fingerprint); row.hidden = false;
      const saved = resolutionState.items.get(item.fingerprint);
      if (resolutionState.loaded && saved?.status === "monitoring") { if (expired(saved)) autoTransition(item, "open", "Monitoring period ended and Search Console still reports the issue."); else row.hidden = true; }
      if (resolutionState.loaded && saved?.status === "dismissed") row.hidden = true;
      if (resolutionState.loaded && saved?.status === "resolved") autoTransition(item, "open", "Previously resolved Search Console signal has returned.");
      let cell = row.querySelector("[data-resolve-cell]"); if (!cell) { cell = document.createElement("td"); cell.dataset.resolveCell = "true"; row.appendChild(cell); }
      let button = cell.querySelector("button"); if (!button) { button = document.createElement("button"); button.type = "button"; button.className = "ccg-btn ccg-btn--ghost seo-resolve-button"; cell.appendChild(button); }
      button.textContent = resolutionState.loaded ? "Resolve" : "Loading…"; button.disabled = !resolutionState.loaded; button.onclick = () => openDialog(item);
    });
    setCount("workQueue", Array.from(table.querySelectorAll("tbody tr")).filter((row) => !row.hidden).length);
    if (resolutionState.loaded) resolutionState.items.forEach((saved, fingerprint) => { if (saved.status === "monitoring" && expired(saved) && !current.has(fingerprint)) autoTransition(fromSaved(saved), "resolved", "Monitoring period ended and the Search Console work-queue signal is no longer present."); });
  }

  function styles() {
    if (document.getElementById("seo-resolution-style")) return;
    const style = document.createElement("style"); style.id = "seo-resolution-style";
    style.textContent = `.seo-resolution-message{margin:0 20px 14px;padding:10px 12px;border:1px solid rgba(255,255,255,.16);border-radius:10px}.seo-resolution-message[data-state="error"]{border-color:rgba(255,94,94,.55)}.seo-resolve-button,.seo-reopen{white-space:nowrap}.seo-resolution-dialog{width:min(820px,calc(100% - 24px));max-height:88vh;padding:0;border:1px solid rgba(255,255,255,.2);border-radius:16px;background:#080c18;color:inherit}.seo-resolution-dialog::backdrop{background:rgba(0,0,0,.72)}.seo-resolution-dialog__panel{padding:22px;overflow:auto}.seo-resolution-dialog header{display:flex;justify-content:space-between;gap:12px}.seo-resolution-dialog h2{margin:3px 0 0}.seo-resolution-close{border:0;background:transparent;color:inherit;font-size:2rem}.seo-resolution-dialog dl{display:grid;gap:8px}.seo-resolution-dialog dl div{padding-top:8px;border-top:1px solid rgba(255,255,255,.09)}.seo-resolution-dialog dt{font-weight:800}.seo-resolution-dialog dd{margin:3px 0 0;overflow-wrap:anywhere}.seo-resolution-dialog label{display:grid;gap:6px;font-weight:800}.seo-resolution-dialog textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:rgba(0,0,0,.3);color:inherit}.seo-resolution-links,.seo-resolution-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}@media(max-width:620px){.seo-resolution-links .ccg-btn,.seo-resolution-actions .ccg-btn{width:100%}}`;
    document.head.appendChild(style);
  }

  function reconcile() { reconcileWorkQueue(); reconcileLegacyDiagnostics(); addResolutionControls(); renderResolutionMonitor(); }
  function observeHost(selector) { const host = document.querySelector(selector); if (!host) return; new MutationObserver(() => reconcile()).observe(host, { childList: true, subtree: true }); }

  function csvCell(value) { const text = String(value ?? "").replace(/\s+/g, " ").trim(); return `"${text.replace(/"/g, '""')}"`; }
  function visibleReportRows() {
    const output = [];
    document.querySelectorAll("[data-seo-section]").forEach((section) => {
      if (section.hidden) return;
      const table = section.querySelector("table"); if (!table) return;
      const sectionName = section.querySelector("h2")?.textContent?.trim() || "SEO report";
      const headers = Array.from(table.querySelectorAll("thead th"), (cell) => cell.textContent || ""); if (!headers.length) return;
      output.push([sectionName, ...headers]);
      table.querySelectorAll("tbody tr").forEach((row) => { if (!row.hidden) output.push([sectionName, ...Array.from(row.cells || [], (cell) => cell.textContent || "")]); });
    });
    return output;
  }
  function exportVisibleReport() {
    reconcile(); const rows = visibleReportRows(); if (!rows.length) return;
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `ccg-seo-visible-report-${new Date().toISOString().slice(0, 10)}.csv`; link.hidden = true; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function interceptVisibleExport() { const button = document.querySelector("[data-seo-export]"); if (!button || button.dataset.managedExport === "true") return; button.dataset.managedExport = "true"; button.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); exportVisibleReport(); }, true); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

  function init() { styles(); observeHost('[data-seo-table="workQueue"]'); observeHost('[data-seo-table="legacy"]'); interceptVisibleExport(); reconcile(); void loadResolutions(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
