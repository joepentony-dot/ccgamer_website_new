/* ============================================================
   CCG Analytics & Growth — Direct GA4 Property Configuration
   ------------------------------------------------------------
   Public measurement ID: G-GT1JB7HMQ4
   Numeric GA4 property ID: 526769734

   Analytics Growth still contains an optional Analytics Admin API
   discovery path. This bridge supplies the known CCG property to
   that path, avoiding any dependency on the Admin API. Real GA4
   report requests continue to go directly to Google's Data API.

   If Google returns SERVICE_DISABLED for the Data API, the wrapper
   preserves the 403, identifies the exact Google Cloud project and
   adds a direct recovery control to the admin page.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_ANALYTICS_GROWTH_CONFIG) return;

  const PROPERTY_ID = "526769734";
  const PROPERTY_PATH = `properties/${PROPERTY_ID}`;
  const MEASUREMENT_ID = "G-GT1JB7HMQ4";
  const ADMIN_ORIGIN = "https://analyticsadmin.googleapis.com";
  const ADMIN_PATH = "/v1beta/accountSummaries";
  const DATA_ORIGIN = "https://analyticsdata.googleapis.com";
  const DATA_SERVICE = "analyticsdata.googleapis.com";
  const nativeFetch = window.fetch.bind(window);
  let blockedProjectNumber = "";

  window.CCG_ANALYTICS_GROWTH_CONFIG = Object.freeze({
    ga4PropertyId: PROPERTY_ID,
    ga4PropertyPath: PROPERTY_PATH,
    measurementId: MEASUREMENT_ID,
    propertyDisplayName: "Cheeky Commodore Gamer GA4",
    dataApiService: DATA_SERVICE,
    source: "configured-property"
  });

  function configuredPropertyResponse() {
    const payload = {
      accountSummaries: [
        {
          account: "accounts/configured-ccg",
          displayName: "Configured CCG analytics",
          propertySummaries: [
            {
              property: PROPERTY_PATH,
              displayName: "Cheeky Commodore Gamer GA4"
            }
          ]
        }
      ]
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-CCG-GA4-Property": PROPERTY_ID
      }
    });
  }

  function findErrorInfo(payload) {
    const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
    return details.find((item) => String(item?.reason || "").toUpperCase() === "SERVICE_DISABLED") || null;
  }

  function projectNumberFromError(payload, info) {
    const consumer = String(info?.metadata?.consumer || "");
    const consumerMatch = consumer.match(/projects\/(\d+)/i);
    if (consumerMatch) return consumerMatch[1];

    const message = String(payload?.error?.message || "");
    const messageMatch = message.match(/project\s+(\d+)/i);
    return messageMatch ? messageMatch[1] : "";
  }

  function dataApiConsoleUrl(projectNumber) {
    const project = encodeURIComponent(String(projectNumber || ""));
    return `https://console.cloud.google.com/apis/library/${DATA_SERVICE}${project ? `?project=${project}` : ""}`;
  }

  function ensureRecoveryStyles() {
    if (document.getElementById("ccg-ga4-data-api-recovery-styles")) return;
    const style = document.createElement("style");
    style.id = "ccg-ga4-data-api-recovery-styles";
    style.textContent = `
      .growth-data-api-recovery{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:-4px 0 18px;padding:14px 16px;border:1px solid rgba(255,184,77,.55);border-radius:12px;background:rgba(255,184,77,.07)}
      .growth-data-api-recovery__copy{min-width:min(100%,520px);flex:1 1 560px}.growth-data-api-recovery__copy strong,.growth-data-api-recovery__copy span{display:block}.growth-data-api-recovery__copy span{margin-top:4px;line-height:1.45;opacity:.82}.growth-data-api-recovery__actions{display:flex;flex-wrap:wrap;gap:8px}.growth-data-api-recovery__actions .ccg-btn{white-space:nowrap}@media(max-width:620px){.growth-data-api-recovery__actions,.growth-data-api-recovery__actions .ccg-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function removeRecoveryUi() {
    document.querySelector("[data-growth-data-api-recovery]")?.remove();
  }

  function renderRecoveryUi(projectNumber) {
    const status = document.querySelector("[data-growth-status]");
    if (!status) return;
    ensureRecoveryStyles();

    let panel = document.querySelector("[data-growth-data-api-recovery]");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "growth-data-api-recovery";
      panel.dataset.growthDataApiRecovery = "true";
      status.insertAdjacentElement("afterend", panel);
    }

    const project = String(projectNumber || "the OAuth Cloud project");
    panel.innerHTML = `
      <div class="growth-data-api-recovery__copy">
        <strong>GA4 needs one Google Cloud switch enabled</strong>
        <span>CCG property ${PROPERTY_ID} is already configured. Project ${escapeHtml(project)} is blocking ${DATA_SERVICE}; enable the Google Analytics Data API there, then reconnect this report.</span>
      </div>
      <div class="growth-data-api-recovery__actions">
        <a class="ccg-btn ccg-btn--primary" href="${escapeHtml(dataApiConsoleUrl(projectNumber))}" target="_blank" rel="noopener noreferrer">Enable Google Analytics Data API</a>
        <button type="button" class="ccg-btn ccg-btn--ghost" data-growth-data-api-retry>Reconnect Google Data</button>
      </div>`;

    panel.querySelector("[data-growth-data-api-retry]")?.addEventListener("click", () => {
      document.querySelector("[data-growth-connect]")?.click();
    });
  }

  function simplifyBlockedStatus() {
    const status = document.querySelector("[data-growth-status]");
    if (!status || !blockedProjectNumber) return;
    const text = String(status.textContent || "");
    if (!/GA4 unavailable|Data API report failed \(403\)|analyticsdata\.googleapis\.com/i.test(text)) return;

    const concise = `Search Console loaded · GA4 blocked by Google Cloud project ${blockedProjectNumber}: Google Analytics Data API is disabled. Enable it below, then reconnect Google Data.`;
    if (status.textContent !== concise) status.textContent = concise;
    status.dataset.state = "error";
    renderRecoveryUi(blockedProjectNumber);
  }

  function installStatusObserver() {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const status = document.querySelector("[data-growth-status]");
      if (!status) {
        if (Date.now() - start > 10000) window.clearInterval(timer);
        return;
      }
      window.clearInterval(timer);
      const observer = new MutationObserver(() => simplifyBlockedStatus());
      observer.observe(status, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-state"] });
      simplifyBlockedStatus();
    }, 50);
  }

  async function conciseDataApiError(response) {
    if (response.status !== 403) {
      blockedProjectNumber = "";
      removeRecoveryUi();
      return response;
    }

    let payload = null;
    try {
      payload = await response.clone().json();
    } catch (error) {
      return response;
    }

    const info = findErrorInfo(payload);
    const message = String(payload?.error?.message || "");
    const service = String(info?.metadata?.service || "");
    const isDataApiDisabled = Boolean(
      String(info?.reason || "").toUpperCase() === "SERVICE_DISABLED" &&
      (!service || service === DATA_SERVICE)
    ) || /Google Analytics Data API has not been used in project|analyticsdata\.googleapis\.com/i.test(message);

    if (!isDataApiDisabled) return response;

    const projectNumber = projectNumberFromError(payload, info) || "the OAuth Cloud project";
    blockedProjectNumber = projectNumber;
    window.setTimeout(() => {
      renderRecoveryUi(projectNumber);
      simplifyBlockedStatus();
    }, 0);

    const diagnostic = [
      `CCG GA4 property ${PROPERTY_ID} is configured correctly`,
      `but Google Cloud project ${projectNumber} is rejecting the Google Analytics Data API (${DATA_SERVICE})`,
      `Verify that exact project shows the Google Analytics Data API as Enabled, then reconnect Google Data`,
      `If it was enabled only recently, allow Google's service activation to propagate and retry`
    ].join(". ") + ".";

    return new Response(diagnostic, {
      status: 403,
      statusText: response.statusText || "Forbidden",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-CCG-GA4-Property": PROPERTY_ID,
        "X-CCG-Google-Service": DATA_SERVICE,
        "X-CCG-Google-Project": projectNumber
      }
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  window.fetch = async function ccgAnalyticsGrowthConfiguredFetch(input, init) {
    const rawUrl = typeof input === "string" ? input : String(input?.url || "");
    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch (error) {
      return nativeFetch(input, init);
    }

    const method = String(init?.method || input?.method || "GET").toUpperCase();

    if (method === "GET" && url.origin === ADMIN_ORIGIN && url.pathname === ADMIN_PATH) {
      return configuredPropertyResponse();
    }

    const response = await nativeFetch(input, init);
    if (url.origin === DATA_ORIGIN) return conciseDataApiError(response);
    return response;
  };

  installStatusObserver();
})();
