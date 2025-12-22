/* ============================================================
   CCG CONTACT FORM — GOOGLE APPS SCRIPT (LIVE DEPLOYMENT)
   ------------------------------------------------------------
   • Uses proven FormData POST (no JSON headers)
   • Compatible with Apps Script Web App
   • Avoids "contents undefined" backend crashes
   • Graceful success / error handling
   • Character counter support
   ============================================================ */

(function () {
    "use strict";

    // ✅ LIVE CONTACT SCRIPT (PUBLIC WEB APP)
    const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbxiLgl-SR8ngptHDnyOqUCRUl2Ia4yjuu2LO4IWMPt7763nmMgrD0qs3hpJOgw7dtsLiA/exec";

    const form = document.querySelector("[data-contact-form]");
    if (!form) return;

    const statusBox = document.querySelector("[data-contact-status]");
    const statusText = statusBox?.querySelector(".contact-status__text") || null;
    const submitBtn = form.querySelector('button[type="submit"]');

    const messageInput = form.querySelector("#contact-message");
    const counterEl = form.querySelector("[data-char-counter]");
    const maxChars = counterEl ? Number(counterEl.dataset.max || 0) : 0;

    /* --------------------------------------------------------
       STATUS HANDLER
    -------------------------------------------------------- */
    function setStatus(state, message) {
        if (!statusBox || !statusText) return;
        statusBox.dataset.state = state;
        statusText.textContent = message;
    }

    /* --------------------------------------------------------
       CHARACTER COUNTER
    -------------------------------------------------------- */
    if (messageInput && counterEl && maxChars > 0) {
        const updateCounter = () => {
            counterEl.textContent = `${messageInput.value.length} / ${maxChars}`;
        };
        messageInput.addEventListener("input", updateCounter);
        updateCounter();
    }

    /* --------------------------------------------------------
       FORM SUBMIT
    -------------------------------------------------------- */
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!submitBtn) return;

        const name = form.name?.value.trim();
        const email = form.email?.value.trim();
        const subject = form.subject?.value.trim() || "Website Contact";
        const message = form.message?.value.trim();

        // Basic validation
        if (!name || !email || !message) {
            setStatus("error", "Please complete all required fields.");
            return;
        }

        if (message.length < 10) {
            setStatus("error", "Message too short. Please add more detail.");
            return;
        }

        submitBtn.disabled = true;
        setStatus("sending", "Transmitting signal…");

        // 🔐 Build FormData EXACTLY like old Google Sites
        const formData = new FormData();
        formData.append("action", "sendEmail");
        formData.append("name", name);
        formData.append("email", email);
        formData.append("topics", subject);
        formData.append("message", message);

        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                body: formData
            });

            const text = await response.text();
            let data = {};

            try {
                data = JSON.parse(text);
            } catch {
                // Apps Script sometimes returns plain text on success
                data = { success: true };
            }

            if (data.success || data.result === "success") {
                setStatus("success", "Message received. I’ll be in touch soon.");
                form.reset();

                if (counterEl && maxChars > 0) {
                    counterEl.textContent = `0 / ${maxChars}`;
                }

                setTimeout(() => {
                    setStatus("idle", "Ready when you are.");
                }, 6000);
            } else {
                throw new Error(data.error || "Message delivery failed.");
            }

        } catch (err) {
            console.error("[Contact]", err);
            setStatus("error", "Transmission failed. Please try again shortly.");
        } finally {
            submitBtn.disabled = false;
        }
    });
})();
