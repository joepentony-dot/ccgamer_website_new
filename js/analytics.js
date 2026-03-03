/* =========================================================
   CCG GLOBAL ANALYTICS LOADER
   Google Analytics 4
   Measurement ID: G-GT1JB7HMQ4
   ========================================================= */

(function () {

  if (window.ccgAnalyticsLoaded) return;
  window.ccgAnalyticsLoaded = true;

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-GT1JB7HMQ4";
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];

  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;

  gtag('js', new Date());

  gtag('config', 'G-GT1JB7HMQ4', {
    anonymize_ip: true
  });

})();
