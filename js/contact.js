/* ============================================================
   CCG CONTACT FORM — GOOGLE APPS SCRIPT (PROVEN METHOD)
   ------------------------------------------------------------
   • Matches old Google Sites behaviour exactly
   • Uses FormData (NOT JSON)
   • Posts to existing Apps Script backend
   • Graceful success / error handling
   • Character counter support
   • Zero impact on global JS / CSS
   ============================================================ */

(function () {
    "use strict";

    const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec";

    const form = document.querySelector("[data-contact-form]");
    if (!form) return;

    const statusBox = document.querySelector("[data-contact-status]");
    const statusText = statusBox?.querySelector(".contact-status__text") || null;
    const submitBtn = form.querySelector('button[type="submit"]');

    const messageInput = form.querySelector("#contact-message");
    const counterEl = form.querySelector("[data-char-counter]");
    const maxChars = counterEl ? Number(counterEl.dataset.max || 0) : 0;

    /* --------------------------------------------------------
       STATUS HELPERS
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
            const len = messageInput.value.length;
            counterEl.textContent = `${len} / ${maxChars}`;
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

        // Basic validation
        if (!form.name.value.trim() || !form.email.value.trim() || !form.message.value.trim()) {
            setStatus("error", "Missing required fields. Please check and try again.");
            return;
        }

        if (form.message.value.trim().length < 10) {
            setStatus("error", "Message too short. Please add more detail.");
            return;
        }

        submitBtn.disabled = true;
        setStatus("sending", "Transmitting signal…");

        const payload = {
            action: "sendEmail",
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            topics: form.subject?.value?.trim() || "Website Contact",
            message: form.message.value.trim()
        };

        // Build FormData EXACTLY like old Google Sites form
        const formData = new FormData();
        formData.append("action", payload.action);
        formData.append("name", payload.name);
        formData.append("email", payload.email);
        formData.append("topics", payload.topics);
        formData.append("message", payload.message);

        // Some Apps Script implementations expect a JSON "contents" payload.
        // Including it avoids backend errors like "Cannot read properties of undefined (reading 'contents')".
        formData.append("contents", JSON.stringify(payload));

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
                data = { success: true }; // Apps Script sometimes returns plain text
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
            setStatus("error", `Transmission failed: ${err.message}`);
        } finally {
            submitBtn.disabled = false;
        }
    });
})();
