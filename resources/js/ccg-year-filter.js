(function () {
    "use strict";

    function setupYearInputs() {
        const rangeMin = document.getElementById("gamesYearMin");
        const rangeMax = document.getElementById("gamesYearMax");
        const inputMin = document.getElementById("gamesYearMinInput");
        const inputMax = document.getElementById("gamesYearMaxInput");

        if (!rangeMin || !rangeMax || !inputMin || !inputMax) return;

        let isSyncing = false;

        const clamp = (value, min, max) => {
            if (!Number.isFinite(value)) return null;
            return Math.min(max, Math.max(min, value));
        };

        const syncInputsFromRange = () => {
            if (isSyncing) return;
            isSyncing = true;
            inputMin.min = rangeMin.min;
            inputMin.max = rangeMin.max;
            inputMax.min = rangeMax.min;
            inputMax.max = rangeMax.max;
            inputMin.value = rangeMin.value;
            inputMax.value = rangeMax.value;
            isSyncing = false;
        };

        const syncRangeFromInputs = () => {
            if (isSyncing) return;
            const minLimit = parseInt(rangeMin.min, 10);
            const maxLimit = parseInt(rangeMax.max, 10);
            const typedMin = clamp(parseInt(inputMin.value, 10), minLimit, maxLimit);
            const typedMax = clamp(parseInt(inputMax.value, 10), minLimit, maxLimit);
            if (typedMin === null || typedMax === null) return;

            const nextMin = Math.min(typedMin, typedMax);
            const nextMax = Math.max(typedMin, typedMax);

            isSyncing = true;
            rangeMin.value = String(nextMin);
            rangeMax.value = String(nextMax);
            rangeMin.dispatchEvent(new Event("input", { bubbles: true }));
            rangeMax.dispatchEvent(new Event("input", { bubbles: true }));
            inputMin.value = String(nextMin);
            inputMax.value = String(nextMax);
            isSyncing = false;
        };

        rangeMin.addEventListener("input", syncInputsFromRange);
        rangeMax.addEventListener("input", syncInputsFromRange);
        inputMin.addEventListener("input", syncRangeFromInputs);
        inputMax.addEventListener("input", syncRangeFromInputs);
        inputMin.addEventListener("blur", syncInputsFromRange);
        inputMax.addEventListener("blur", syncInputsFromRange);

        syncInputsFromRange();

        let syncAttempts = 0;
        const syncTimer = window.setInterval(() => {
            syncInputsFromRange();
            syncAttempts += 1;
            if (syncAttempts >= 10) {
                window.clearInterval(syncTimer);
            }
        }, 200);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupYearInputs, { once: true });
    } else {
        setupYearInputs();
    }
})();
