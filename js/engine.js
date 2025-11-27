/* ============================================================
   SAFE ENGINE.JS — STABILISER VERSION
   ------------------------------------------------------------
   This file intentionally contains **NO boot logic**,
   **NO theme logic**, **NO search logic**, **NO social logic**,
   and **NO audio logic**.

   Its only purpose: prevent JavaScript errors from crashing the
   homepage while we continue building Phase D.

   Once Phase D is complete, we will reintroduce the proper
   boot engine cleanly and safely.
   ============================================================ */

(function () {
    "use strict";

    // --- Minimal starfield so background still looks alive ---
    function initStarfield() {
        const canvas = document.getElementById("starfield");
        if (!canvas || !canvas.getContext) return;

        const ctx = canvas.getContext("2d");
        let stars = [];
        let width = window.innerWidth;
        let height = window.innerHeight;

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            stars = [];
            for (let i = 0; i < 90; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 2,
                    speed: 0.3 + Math.random() * 0.6
                });
            }
        }

        function update() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "#fff";

            for (let s of stars) {
                s.y += s.speed;
                if (s.y > height) {
                    s.y = 0;
                    s.x = Math.random() * width;
                }
                ctx.globalAlpha = 0.4;
                ctx.fillRect(s.x, s.y, s.size, s.size);
            }

            ctx.globalAlpha = 1;
            requestAnimationFrame(update);
        }

        window.addEventListener("resize", resize);
        resize();
        update();
    }

    // --- No sounds, no click events, no theme switching ---
    function initPlaceholders() {
        window.ccgSearchInit = function(){};
        window.ccgSocialBar  = function(){ return ""; };
    }

    function onReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    onReady(() => {
        initStarfield();
        initPlaceholders();
    });

})();
