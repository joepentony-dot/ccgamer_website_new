/* ============================================================
   CCG Analytics & Growth — Direct GA4 Property Configuration
   ------------------------------------------------------------
   Public measurement ID: G-GT1JB7HMQ4
   Numeric GA4 property ID: 526769734

   This file supplies the known property directly to the private
   Analytics & Growth dashboard. It deliberately does not patch
   window.fetch and does not require Analytics Admin API property
   discovery.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_ANALYTICS_GROWTH_CONFIG) return;

  const PROPERTY_ID = "526769734";

  window.CCG_ANALYTICS_GROWTH_CONFIG = Object.freeze({
    ga4PropertyId: PROPERTY_ID,
    ga4PropertyPath: `properties/${PROPERTY_ID}`,
    measurementId: "G-GT1JB7HMQ4",
    propertyDisplayName: "Cheeky Commodore Gamer GA4",
    source: "configured-property"
  });
})();
