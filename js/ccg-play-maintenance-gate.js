(function () {
  "use strict";

  var productionHosts = {
    "www.cheekycommodoregamer.co.uk": true,
    "cheekycommodoregamer.co.uk": true
  };

  if (!productionHosts[String(window.location.hostname || "").toLowerCase()]) return;

  var maintenancePath = "/games/ccg-games/";
  if (window.location.pathname === maintenancePath) return;

  window.location.replace(maintenancePath);
})();
