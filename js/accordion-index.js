// ================================
// CCG - SIMPLE ACCORDION HANDLER
// ================================

(function () {
    function initAccordion() {
        const headers = document.querySelectorAll(".accordion-header");
        if (!headers.length) return;

        headers.forEach(header => {
            header.addEventListener("click", () => {
                const body = header.nextElementSibling;
                if (!body) return;

                const isOpen = body.classList.contains("open");

                // Close all others
                document.querySelectorAll(".accordion-body.open").forEach(b => {
                    b.classList.remove("open");
                    b.style.maxHeight = null;
                });

                if (!isOpen) {
                    body.classList.add("open");
                    body.style.maxHeight = body.scrollHeight + "px";
                } else {
                    body.classList.remove("open");
                    body.style.maxHeight = null;
                }
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAccordion);
    } else {
        initAccordion();
    }
})();
