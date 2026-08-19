/* ============================================================
   CCG Analytics & Growth — Direct GA4 Property Configuration
   ------------------------------------------------------------
   The public site measurement ID is G-GT1JB7HMQ4 and the GA4
   numeric property ID is 526769734. Analytics Growth already
   uses the GA4 Data API once a property is selected; this bridge
   supplies that known property locally so the dashboard does not
   depend on the optional Analytics Admin API being enabled.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_ANALYTICS_GROWTH_CONFIG) return;

  const PROPERTY_ID = "526769734";
  const PROPERTY_PATH = `properties/${PROPERTY_ID}`;
  const MEASUREMENT_ID = "G-GT1JB7HMQ4";
  const ADMIN_ORIGIN = "https://analyticsadmin.googleapis.com";
  const ADMIN_PATH = "/v1beta/accountSummaries";
  const nativeFetch = window.fetch.bind(window);

  window.CCG_ANALYTICS_GROWTH_CONFIG = Object.freeze({
    ga4PropertyId: PROPERTY_ID,
    ga4PropertyPath: PROPERTY_PATH,
    measurementId: MEASUREMENT_ID,
    propertyDisplayName: "Cheeky Commodore Gamer GA4",
    source: "configured-property"
  });

  window.fetch = function ccgAnalyticsGrowthConfiguredFetch(input, init) {
    const rawUrl = typeof input === "string" ? input : String(input?.url || "");
    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch (error) {
      return nativeFetch(input, init);
    }

    const method = String(init?.method || input?.method || "GET").toUpperCase();
    if (method !== "GET" || url.origin !== ADMIN_ORIGIN || url.pathname !== ADMIN_PATH) {
      return nativeFetch(input, init);
    }

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

    return Promise.resolve(new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }));
  };
})();
