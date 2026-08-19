/* ============================================================
   CCG SEO Opportunity Centre — Managed Legacy Route Reconciler
   ------------------------------------------------------------
   Some compatibility handlers are intentionally retained with
   noindex,follow while canonical routes take over. Search Console
   impressions on those handlers are useful retirement diagnostics,
   but they are not by themselves an SEO fault or a work-queue task.
============================================================ */

(function () {
  "use strict";

  const MANAGED_ROUTES = new Map([
    ["/games/game.html", "Managed noindex,follow game handler"],
    ["/music/composer.html", "Managed noindex,follow composer handler"]
  ]);

  function routeInfo(value) {
    try {
      const url = new URL(String(value || ""), window.location.origin);
      const label = MANAGED_ROUTES.get(url.pathname);
      return label ? { managed: true, label, pathname: url.pathname } : { managed: false };
    } catch (error) {
      return { managed: false };
    }
  }

  function setCount(name, value) {
    const count = document.querySelector(`[data-seo-count="${name}"]`);
    if (count && count.textContent !== String(value)) count.textContent = String(value);
  }

  function reconcileWorkQueue() {
    const host = document.querySelector('[data-seo-table="workQueue"]');
    if (!host || !host.querySelector("table")) return;

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

    if (remaining === 0) {
      host.innerHTML = '<p class="seo-empty">No actionable work-queue items were found for this period. Managed noindex legacy routes remain available in the diagnostic section below.</p>';
    }
  }

  function reconcileLegacyDiagnostics() {
    const host = document.querySelector('[data-seo-table="legacy"]');
    if (!host || !host.querySelector("table")) return;

    const rows = Array.from(host.querySelectorAll("tbody tr"));
    rows.forEach((row) => {
      if (row.dataset.managedLegacy === "true") return;
      const pageLink = row.cells?.[0]?.querySelector("a[href]");
      if (!pageLink) return;
      const info = routeInfo(pageLink.href);
      if (!info.managed) return;

      row.dataset.managedLegacy = "true";
      if (row.cells?.[1]) row.cells[1].textContent = info.label;
      const actionCell = row.cells?.[row.cells.length - 1];
      if (actionCell) {
        actionCell.innerHTML = '<strong>Monitor Google retirement</strong><small class="seo-action-detail">This compatibility route is intentionally retained with noindex,follow. Search Console impressions are not an SEO fault by themselves; investigate only if the canonical destination is wrong or impressions fail to decline over time.</small>';
      }
    });
  }

  function reconcile() {
    reconcileWorkQueue();
    reconcileLegacyDiagnostics();
  }

  function observeHost(selector) {
    const host = document.querySelector(selector);
    if (!host) return;
    const observer = new MutationObserver(() => reconcile());
    observer.observe(host, { childList: true, subtree: true });
  }

  function csvCell(value) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return `"${text.replace(/"/g, '""')}"`;
  }

  function visibleReportRows() {
    const output = [];
    document.querySelectorAll("[data-seo-section]").forEach((section) => {
      if (section.hidden) return;
      const table = section.querySelector("table");
      if (!table) return;

      const sectionName = section.querySelector("h2")?.textContent?.trim() || "SEO report";
      const headers = Array.from(table.querySelectorAll("thead th"), (cell) => cell.textContent || "");
      if (!headers.length) return;
      output.push([sectionName, ...headers]);

      table.querySelectorAll("tbody tr").forEach((row) => {
        const cells = Array.from(row.cells || [], (cell) => cell.textContent || "");
        output.push([sectionName, ...cells]);
      });
    });
    return output;
  }

  function exportVisibleReport() {
    reconcile();
    const rows = visibleReportRows();
    if (!rows.length) return;

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ccg-seo-visible-report-${stamp}.csv`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function interceptVisibleExport() {
    const button = document.querySelector("[data-seo-export]");
    if (!button || button.dataset.managedExport === "true") return;
    button.dataset.managedExport = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportVisibleReport();
    }, true);
  }

  function init() {
    observeHost('[data-seo-table="workQueue"]');
    observeHost('[data-seo-table="legacy"]');
    interceptVisibleExport();
    reconcile();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
