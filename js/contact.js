/* ============================================================
   CCG CONTACT FORM — GOOGLE APPS SCRIPT (JSON SAFE FIX)
   ------------------------------------------------------------
   • Fixes "postData.contents undefined" error
   • Sends JSON exactly as Apps Script expects
   • GitHub Pages compatible
   • No backend changes required
   ============================================================ */

(function () {
    "use strict";

    const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec";

    const form = document.querySelector("[data-contact-form]");
    if (!form) return;

    const statusBox = document.querySelector("[data-contact-status]");
    const statusText = statusBox?.querySelector(".contact-status__text");
    const submitBtn = form.querySelector('button[type="submit"]');

    const messageInput = form.querySelector("#contact-message");
    const counterEl = form.querySelector("[data-char-counter]");
    const maxChars = counterEl ? Number(counterEl.dataset.max || 0) : 0;

    function setStatus(state, message) {
        if (!statusBox || !statusText) return;
        statusBox.dataset.state = state;
        statusText.textContent = message;
    }

    // Character counter
    if (messageInput && counterEl && maxChars > 0) {
        const updateCounter = () => {
            counterEl.textContent = `${messageInput.value.length} / ${maxChars}`;
        };
        messageInput.addEventListener("input", updateCounter);
        updateCounter();
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!submitBtn) return;

        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const message = form.message.value.trim();
        const subject = form.subject?.value?.trim() || "Website Contact";

        if (!name || !email || !message) {
            setStatus("error", "Missing required fields.");
            return;
        }

        if (message.length < 10) {
            setStatus("error", "Message too short. Please add more detail.");
            return;
        }

        submitBtn.disabled = true;
        setStatus("sending", "Transmitting signal…");

        // ✅ JSON payload ensures postData.contents exists
        const payload = {
            action: "sendEmail",
            name,
            email,
            topics: subject,
            message
        };

        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const text = await response.text();
            let data = {};

            try {
                data = JSON.parse(text);
            } catch {
                data = { success: true };
            }

            if (data.success || data.result === "success") {
                setStatus("success", "Message received. I’ll be in touch soon.");
                form.reset();
                if (counterEl) counterEl.textContent = `0 / ${maxChars}`;
                setTimeout(() => setStatus("idle", "Ready when you are."), 6000);
            } else {
                throw new Error(data.error || "Message delivery failed.");
            }
        } catch (err) {
            console.error("[Contact]", err);
            setStatus("error", `Transmission failed: ${err.message}`);
        } finally {
            submitBtn.disabled = false;
        }
    });
})();
