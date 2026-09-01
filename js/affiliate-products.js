(function () {
    "use strict";

    const CONFIG_PATH = "resources/data/affiliate-products.json";
    const STYLE_PATH = "resources/css/ccg-affiliate-showcase.css";
    const GAME_SECTION_ID = "affiliate-products-section";
    const HOME_SPOTLIGHT_SELECTOR = "[data-ccg-home-affiliate-spotlight]";

    let configPromise = null;

    function toSafeString(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    function normaliseKey(value) {
        return toSafeString(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function resolveSiteRoot() {
        const root = typeof window.ccgGetSiteRoot === "function" ? window.ccgGetSiteRoot() : "/";
        const safeRoot = toSafeString(root) || "/";
        return safeRoot.endsWith("/") ? safeRoot : `${safeRoot}/`;
    }

    function resolveSiteUrl(path) {
        const source = toSafeString(path);
        if (!source) return "";
        if (/^https?:\/\//i.test(source)) return source;
        return `${resolveSiteRoot()}${source.replace(/^\/+/, "")}`;
    }

    function ensureStylesheet() {
        if (document.querySelector('link[data-ccg-affiliate-showcase-style="true"]')) return;

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = resolveSiteUrl(STYLE_PATH);
        link.setAttribute("data-ccg-affiliate-showcase-style", "true");
        document.head.appendChild(link);
    }

    async function loadConfig() {
        if (!configPromise) {
            configPromise = fetch(resolveSiteUrl(CONFIG_PATH), { credentials: "same-origin" })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Affiliate catalogue request failed: ${response.status}`);
                    }
                    return response.json();
                })
                .catch((error) => {
                    configPromise = null;
                    throw error;
                });
        }
        return configPromise;
    }

    function isAmazonUkHost(hostname) {
        const host = toSafeString(hostname).toLowerCase();
        return host === "amazon.co.uk" || host.endsWith(".amazon.co.uk");
    }

    function validateAffiliateUrl(rawUrl, account) {
        const source = toSafeString(rawUrl);
        const activeTag = toSafeString(account?.activeTag).toLowerCase();
        const retiredTags = Array.isArray(account?.retiredTags)
            ? account.retiredTags.map((tag) => toSafeString(tag).toLowerCase()).filter(Boolean)
            : [];

        if (!source || !activeTag) return null;

        try {
            const url = new URL(source, window.location.href);
            if (url.protocol !== "https:" || !isAmazonUkHost(url.hostname)) return null;

            const tag = toSafeString(url.searchParams.get("tag")).toLowerCase();
            if (!tag || tag !== activeTag || retiredTags.includes(tag)) return null;

            return url.toString();
        } catch (_error) {
            return null;
        }
    }

    function getProduct(config, productId) {
        const key = toSafeString(productId);
        if (!key || !config?.products || typeof config.products !== "object") return null;
        return config.products[key] || null;
    }

    function getGroup(config, groupId) {
        const key = normaliseKey(groupId);
        if (!key || !config?.groups || typeof config.groups !== "object") return null;
        return config.groups[key] || null;
    }

    function resolveGameSlug(section) {
        return normaliseKey(
            section?.dataset?.gameSlug ||
            document.body?.dataset?.gameSlug ||
            section?.dataset?.gameId ||
            document.body?.dataset?.gameId
        );
    }

    function resolveGameSystem(section) {
        return toSafeString(section?.dataset?.gameSystem || document.body?.dataset?.gameSystem);
    }

    function resolveMappedGroup(map, rawValue) {
        if (!map || typeof map !== "object" || !rawValue) return "";

        if (map[rawValue]) return normaliseKey(map[rawValue]);

        const target = normaliseKey(rawValue);
        const match = Object.keys(map).find((key) => normaliseKey(key) === target);
        return match ? normaliseKey(map[match]) : "";
    }

    function resolveGameGroup(config, section) {
        const directGroup = normaliseKey(
            section?.dataset?.affiliateGroup ||
            section?.getAttribute("data-affiliate-group") ||
            document.body?.dataset?.affiliateGroup
        );
        if (directGroup && getGroup(config, directGroup)) return directGroup;

        const slug = resolveGameSlug(section);
        const override = slug && config?.gameOverrides && typeof config.gameOverrides === "object"
            ? config.gameOverrides[slug] || config.gameOverrides[slug.replace(/-/g, "_")]
            : null;
        if (override?.enabled === false) return "";
        if (override?.group && getGroup(config, override.group)) return normaliseKey(override.group);

        const system = resolveGameSystem(section);
        const systemGroup = resolveMappedGroup(config?.systemGroups, system);
        if (systemGroup && getGroup(config, systemGroup)) return systemGroup;

        return "";
    }

    function resolveGroupProducts(config, group) {
        const ids = Array.isArray(group?.products) ? group.products : [];
        const maxProducts = Number(config?.defaults?.maxProducts) || 3;

        return ids
            .map((id) => ({ id: toSafeString(id), product: getProduct(config, id) }))
            .filter(({ id, product }) => id && product)
            .filter(({ product }) => validateAffiliateUrl(product.url, config.account))
            .slice(0, Math.max(1, Math.min(maxProducts, 4)));
    }

    function getProductButtonText(product) {
        const releaseDate = Date.parse(toSafeString(product?.releaseDate));
        if (Number.isFinite(releaseDate) && Date.now() < releaseDate) {
            return toSafeString(product?.preReleaseButtonText) || "Pre-order on Amazon";
        }
        return toSafeString(product?.buttonText) || "View on Amazon";
    }

    function createAffiliateLink(product, config, className) {
        const href = validateAffiliateUrl(product?.url, config?.account);
        if (!href) return null;

        const link = document.createElement("a");
        link.className = className;
        link.href = href;
        link.target = "_blank";
        link.rel = "nofollow sponsored noopener";
        link.setAttribute("data-ccg-affiliate-link", "amazon-associates-2026");
        link.setAttribute("data-ccg-revenue-link", "amazon-associates-2026");
        link.setAttribute("aria-label", `${getProductButtonText(product)} - ${toSafeString(product?.title)} (affiliate link)`);
        link.textContent = getProductButtonText(product);
        return link;
    }

    function createProductCard(entry, config) {
        const product = entry.product;
        const article = document.createElement("article");
        article.className = "affiliate-product-card affiliate-product-card--ccg-pick";
        article.setAttribute("data-ccg-affiliate-product", entry.id);

        const topLine = document.createElement("div");
        topLine.className = "affiliate-product-card__topline";

        const badge = document.createElement("span");
        badge.className = "affiliate-product-card__badge";
        badge.textContent = toSafeString(product.badge) || "CCG PICK";

        const category = document.createElement("span");
        category.className = "affiliate-product-card__category";
        category.textContent = toSafeString(product.category) || "Retro gear";

        topLine.append(badge, category);

        const heading = document.createElement("h3");
        heading.className = "affiliate-product-card__title";
        heading.textContent = toSafeString(product.title);

        const description = document.createElement("p");
        description.className = "affiliate-product-card__description";
        description.textContent = toSafeString(product.description);

        const cta = createAffiliateLink(
            product,
            config,
            "affiliate-product-card__cta ccg-btn ccg-btn--neon"
        );
        if (!cta) return null;

        article.append(topLine, heading);
        if (description.textContent) article.appendChild(description);
        article.appendChild(cta);
        return article;
    }

    function createDisclosure(config, className) {
        const wrapper = document.createElement("p");
        wrapper.className = className;
        wrapper.append(document.createTextNode(toSafeString(config?.account?.disclosure) || "As an Amazon Associate I earn from qualifying purchases."));

        const disclosureUrl = toSafeString(config?.account?.disclosureUrl);
        if (disclosureUrl) {
            wrapper.append(document.createTextNode(" "));
            const link = document.createElement("a");
            link.href = resolveSiteUrl(disclosureUrl);
            link.textContent = "Affiliate disclosure";
            wrapper.appendChild(link);
        }

        return wrapper;
    }

    function hideGameSection(section) {
        if (!section) return;
        section.hidden = true;
        section.setAttribute("aria-hidden", "true");
        section.classList.remove("affiliate-products-section--showcase", "is-hardware-open");

        const panel = section.querySelector("[data-hardware-panel]");
        if (panel) panel.hidden = true;
    }

    function positionGameSection(section) {
        if (!section || !section.parentElement) return;

        const descriptionSection = document.getElementById("game-description-section");
        const videoSection = document.getElementById("game-video-section");
        const heroSection = document.querySelector(".game-hero");

        const anchor = descriptionSection && !descriptionSection.hidden
            ? descriptionSection
            : videoSection && !videoSection.hidden
                ? videoSection
                : heroSection;

        if (!anchor || anchor.parentElement !== section.parentElement) return;
        if (anchor.nextElementSibling !== section) {
            anchor.insertAdjacentElement("afterend", section);
        }
    }

    function renderGameShowcase(config) {
        const section = document.getElementById(GAME_SECTION_ID);
        if (!section) return;

        if (config?.defaults?.enabled === false) {
            hideGameSection(section);
            return;
        }

        const system = resolveGameSystem(section);
        if (!system) {
            hideGameSection(section);
            return;
        }

        const groupId = resolveGameGroup(config, section);
        const group = getGroup(config, groupId);
        const entries = resolveGroupProducts(config, group);
        if (!group || !entries.length) {
            hideGameSection(section);
            return;
        }

        const grid = section.querySelector("#affiliate-products-grid");
        const title = section.querySelector(".affiliate-products-title");
        const intro = section.querySelector(".affiliate-products-disclosure");
        const toggle = section.querySelector("[data-hardware-toggle]");
        const panel = section.querySelector("[data-hardware-panel]");

        if (!grid || !panel) {
            hideGameSection(section);
            return;
        }

        grid.textContent = "";
        entries
            .map((entry) => createProductCard(entry, config))
            .filter(Boolean)
            .forEach((card) => grid.appendChild(card));

        if (!grid.children.length) {
            hideGameSection(section);
            return;
        }

        if (title) title.textContent = toSafeString(group.heading) || "CCG Recommended Gear";
        if (intro) intro.textContent = toSafeString(group.intro) || "A small set of CCG picks matched to the system you're browsing.";

        section.querySelectorAll(".affiliate-products-legal").forEach((node) => node.remove());
        panel.appendChild(createDisclosure(config, "affiliate-products-legal"));

        section.classList.add("affiliate-products-section--showcase");
        section.classList.remove("is-hardware-open");
        section.hidden = false;
        section.removeAttribute("aria-hidden");
        section.setAttribute("aria-label", `${toSafeString(group.heading) || "CCG recommended gear"} - Amazon affiliate links`);

        panel.hidden = false;
        if (toggle) {
            toggle.hidden = true;
            toggle.disabled = true;
            toggle.setAttribute("aria-expanded", "true");
        }

        positionGameSection(section);
        requestAnimationFrame(() => requestAnimationFrame(() => positionGameSection(section)));
        window.setTimeout(() => positionGameSection(section), 180);
    }

    function isWithinWindow(startValue, endValue) {
        const now = Date.now();
        const start = Date.parse(toSafeString(startValue));
        const end = Date.parse(toSafeString(endValue));
        if (Number.isFinite(start) && now < start) return false;
        if (Number.isFinite(end) && now > end) return false;
        return true;
    }

    function createHomeSpotlight(config, spotlight, product) {
        const section = document.createElement("section");
        section.className = "ccg-home-affiliate-spotlight ccg-chapter";
        section.setAttribute("data-ccg-home-affiliate-spotlight", "true");
        section.setAttribute("aria-labelledby", "ccg-home-a1200-title");

        const inner = document.createElement("div");
        inner.className = "ccg-home-affiliate-spotlight__inner";

        const copy = document.createElement("div");
        copy.className = "ccg-home-affiliate-spotlight__copy";

        const eyebrow = document.createElement("p");
        eyebrow.className = "ccg-home-affiliate-spotlight__eyebrow";
        eyebrow.textContent = toSafeString(spotlight.eyebrow) || "CCG HARDWARE SPOTLIGHT";

        const heading = document.createElement("h2");
        heading.className = "ccg-home-affiliate-spotlight__title";
        heading.id = "ccg-home-a1200-title";
        heading.textContent = toSafeString(spotlight.headline) || toSafeString(product.title);

        const body = document.createElement("p");
        body.className = "ccg-home-affiliate-spotlight__text";
        body.textContent = toSafeString(spotlight.copy) || toSafeString(product.description);

        const actions = document.createElement("div");
        actions.className = "ccg-home-affiliate-spotlight__actions";
        const cta = createAffiliateLink(product, config, "ccg-btn ccg-btn--neon ccg-home-affiliate-spotlight__cta");
        if (!cta) return null;
        actions.appendChild(cta);

        const legal = createDisclosure(config, "ccg-home-affiliate-spotlight__legal");
        copy.append(eyebrow, heading, body, actions, legal);

        const release = document.createElement("div");
        release.className = "ccg-home-affiliate-spotlight__release";
        release.setAttribute("aria-label", toSafeString(spotlight.releaseLabel) || "THEA1200 release information");

        const releaseMark = document.createElement("span");
        releaseMark.className = "ccg-home-affiliate-spotlight__machine";
        releaseMark.textContent = "A1200";
        releaseMark.setAttribute("aria-hidden", "true");

        const releaseKicker = document.createElement("span");
        releaseKicker.className = "ccg-home-affiliate-spotlight__release-kicker";
        releaseKicker.textContent = Date.now() < Date.parse(toSafeString(product.releaseDate)) ? "COMING" : "RELEASED";

        const releaseDate = document.createElement("time");
        releaseDate.className = "ccg-home-affiliate-spotlight__release-date";
        releaseDate.dateTime = "2026-12-04";
        releaseDate.textContent = "04 · 12 · 2026";

        const releaseName = document.createElement("span");
        releaseName.className = "ccg-home-affiliate-spotlight__release-name";
        releaseName.textContent = "THEA1200";

        release.append(releaseMark, releaseKicker, releaseDate, releaseName);
        inner.append(copy, release);
        section.appendChild(inner);
        return section;
    }

    function renderHomeSpotlight(config) {
        if (document.documentElement.getAttribute("data-ccg-page") !== "home") return;

        const existing = document.querySelector(HOME_SPOTLIGHT_SELECTOR);
        const spotlight = config?.homepageSpotlight;
        if (!spotlight?.enabled || !isWithinWindow(spotlight.start, spotlight.end)) {
            existing?.remove();
            return;
        }

        const product = getProduct(config, spotlight.product);
        if (!product || !validateAffiliateUrl(product.url, config.account)) {
            existing?.remove();
            return;
        }

        if (existing) return;

        const section = createHomeSpotlight(config, spotlight, product);
        const hero = document.querySelector(".home-hero");
        if (!section || !hero || !hero.parentElement) return;

        hero.insertAdjacentElement("afterend", section);
    }

    async function renderAll() {
        ensureStylesheet();
        try {
            const config = await loadConfig();
            renderGameShowcase(config);
            renderHomeSpotlight(config);
        } catch (_error) {
            hideGameSection(document.getElementById(GAME_SECTION_ID));
        }
    }

    function scheduleRender() {
        window.setTimeout(renderAll, 0);
    }

    if (document.readyState === "complete") {
        scheduleRender();
    } else {
        document.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
    }

    window.addEventListener("load", scheduleRender, { once: true });
    window.addEventListener("ccg:game-loaded", scheduleRender);
})();
