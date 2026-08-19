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
   preserves the 403 but replaces the huge raw payload with a short,
   actionable diagnostic containing the exact Cloud project/service.
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

  async function conciseDataApiError(response) {
    if (response.status !== 403) return response;

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
})();
