(function () {
    "use strict";

    const AFFILIATE_DATA_PATH = "resources/data/affiliate-products.json";

    function toSafeString(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    function normaliseKey(value) {
        return toSafeString(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function readTokens(value) {
        if (!value) return [];
        return String(value)
            .split(",")
            .map((token) => normaliseKey(token))
            .filter(Boolean);
    }

    function readSection() {
        return document.getElementById("affiliate-products-section");
    }

    function hideSection(section) {
        if (!section) return;
        const hardware = section.querySelector(".game-facts__hardware");
        if (hardware) {
            hardware.hidden = true;
            return;
        }
        section.hidden = true;
    }

    function resolveDataUrl() {
        const root = (typeof window.ccgGetSiteRoot === "function") ? window.ccgGetSiteRoot() : "/";
        const rootPrefix = String(root || "/").endsWith("/") ? String(root || "/") : `${root}/`;
        return `${rootPrefix}${AFFILIATE_DATA_PATH}`;
    }

    function resolveAssetUrl(path) {
        const source = toSafeString(path);
        if (!source) return "";
        if (/^(https?:)?\/\//i.test(source) || source.startsWith("data:")) {
            return source;
        }

        const root = (typeof window.ccgGetSiteRoot === "function") ? window.ccgGetSiteRoot() : "/";
        const rootPrefix = String(root || "/").endsWith("/") ? String(root || "/") : `${root}/`;
        return `${rootPrefix}${source.replace(/^\/+/, "")}`;
    }

    function resolveSlug(section) {
        const sectionSlug = normaliseKey(section?.dataset?.gameSlug);
        if (sectionSlug) return sectionSlug;

        const bodySlug = normaliseKey(document.body?.dataset?.gameSlug);
        if (bodySlug) return bodySlug;

        const gameId = normaliseKey(section?.dataset?.gameId || document.body?.dataset?.gameId);
        if (gameId) return gameId;

        return "";
    }

    function resolveGroupOverride(section) {
        const direct = normaliseKey(section?.dataset?.affiliateGroup || section?.getAttribute("data-affiliate-group"));
        if (direct) return direct;

        return normaliseKey(document.body?.dataset?.affiliateGroup);
    }

    function resolveOptionalGroup(config, section) {
        const genreGroups = config?.genreGroups && typeof config.genreGroups === "object" ? config.genreGroups : null;
        const collectionGroups = config?.collectionGroups && typeof config.collectionGroups === "object" ? config.collectionGroups : null;

        if (genreGroups) {
            const source = section?.dataset?.gameGenres || document.body?.dataset?.gameGenres;
            const genres = readTokens(source);
            for (const genre of genres) {
                const mapped = normaliseKey(genreGroups[genre] || genreGroups[normaliseKey(genre)]);
                if (mapped) return mapped;
            }
        }

        if (collectionGroups) {
            const source = section?.dataset?.gameCollections || document.body?.dataset?.gameCollections;
            const collections = readTokens(source);
            for (const collection of collections) {
                const mapped = normaliseKey(collectionGroups[collection] || collectionGroups[normaliseKey(collection)]);
                if (mapped) return mapped;
            }
        }

        return "";
    }

    function getOverride(config, slug) {
        const overrides = config?.gameOverrides && typeof config.gameOverrides === "object" ? config.gameOverrides : null;
        if (!overrides || !slug) return null;

        return overrides[slug] || overrides[slug.replace(/-/g, "_")] || null;
    }

    function resolveSystemGroup(config, section) {
        const systemGroups = config?.systemGroups && typeof config.systemGroups === "object" ? config.systemGroups : null;
        if (!systemGroups) return "";

        const system = toSafeString(section?.dataset?.gameSystem || document.body?.dataset?.gameSystem);
        if (!system) return "";

        return normaliseKey(systemGroups[system] || systemGroups[normaliseKey(system)]);
    }

    function getProductsForGroup(config, groupKey) {
        if (!groupKey) return [];
        const groups = config?.groups && typeof config.groups === "object" ? config.groups : null;
        if (!groups) return [];

        const products = groups[groupKey];
        return Array.isArray(products) ? products : [];
    }

    function resolveProducts(config, section) {
        const defaults = config?.defaults && typeof config.defaults === "object" ? config.defaults : {};
        if (defaults.enabled === false) return { products: [], defaults };

        const slug = resolveSlug(section);
        const overrideGroup = resolveGroupOverride(section);
        const override = getOverride(config, slug);

        if (overrideGroup) {
            const products = getProductsForGroup(config, overrideGroup);
            if (products.length) return { products, defaults };
        }

        if (override && override.enabled === false) {
            return { products: [], defaults };
        }

        if (override && Array.isArray(override.products) && override.products.length) {
            return { products: override.products, defaults };
        }

        if (override && override.group) {
            const products = getProductsForGroup(config, normaliseKey(override.group));
            if (products.length) return { products, defaults };
        }

        const optionalGroup = resolveOptionalGroup(config, section);
        if (optionalGroup) {
            const products = getProductsForGroup(config, optionalGroup);
            if (products.length) return { products, defaults };
        }

        const systemGroup = resolveSystemGroup(config, section);
        if (systemGroup) {
            const products = getProductsForGroup(config, systemGroup);
            if (products.length) return { products, defaults };
        }

        const fallbackProducts = getProductsForGroup(config, "default");
        return { products: fallbackProducts, defaults };
    }

    function createCard(product) {
        const title = toSafeString(product?.title);
        const url = toSafeString(product?.url);
        if (!title || !url) return null;

        const article = document.createElement("article");
        article.className = "affiliate-product-card";

        const mediaWrap = document.createElement("div");
        mediaWrap.className = "affiliate-product-card__media";

        const imageSrc = toSafeString(product?.image);
        if (imageSrc) {
            const image = document.createElement("img");
            image.className = "affiliate-product-card__image";
            image.src = resolveAssetUrl(imageSrc);
            image.alt = toSafeString(product?.alt) || title;
            image.loading = "lazy";
            image.decoding = "async";
            image.referrerPolicy = "no-referrer";
            image.addEventListener("error", function () {
                mediaWrap.hidden = true;
            });
            mediaWrap.appendChild(image);
        } else {
            mediaWrap.hidden = true;
        }

        const heading = document.createElement("h3");
        heading.className = "affiliate-product-card__title";
        heading.textContent = title;

        const description = document.createElement("p");
        description.className = "affiliate-product-card__description";
        description.textContent = toSafeString(product?.description);

        const cta = document.createElement("a");
        cta.className = "affiliate-product-card__cta ccg-btn ccg-btn--ghost";
        cta.href = url;
        cta.textContent = toSafeString(product?.buttonText) || "View on Amazon";
        cta.target = "_blank";
        cta.rel = "nofollow sponsored noopener";

        article.appendChild(mediaWrap);
        article.appendChild(heading);
        if (description.textContent) {
            article.appendChild(description);
        }
        article.appendChild(cta);
        return article;
    }

    async function initAffiliateProducts() {
        const section = readSection();
        if (!section) return;

        try {
            const response = await fetch(resolveDataUrl(), { credentials: "same-origin" });
            if (!response.ok) {
                hideSection(section);
                return;
            }

            const config = await response.json();
            const { products, defaults } = resolveProducts(config, section);
            const validProducts = Array.isArray(products) ? products.map(createCard).filter(Boolean) : [];

            if (!validProducts.length) {
                hideSection(section);
                return;
            }

            const titleEl = section.querySelector(".affiliate-products-title");
            const disclosureEl = section.querySelector(".affiliate-products-disclosure");
            const gridEl = section.querySelector("#affiliate-products-grid");
            if (!gridEl) {
                hideSection(section);
                return;
            }

            gridEl.textContent = "";
            validProducts.slice(0, 8).forEach((card) => gridEl.appendChild(card));

            if (titleEl) {
                titleEl.textContent = toSafeString(defaults?.heading) || "Play on Modern Hardware";
            }

            if (disclosureEl) {
                disclosureEl.textContent = toSafeString(defaults?.disclosure) || "As an Amazon Associate I earn from qualifying purchases.";
            }

            const hardware = section.querySelector(".game-facts__hardware");
            if (hardware) {
                hardware.hidden = false;
            }
            section.hidden = false;
        } catch (_error) {
            hideSection(section);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAffiliateProducts, { once: true });
    } else {
        initAffiliateProducts();
    }

    window.addEventListener("ccg:game-loaded", function () {
        initAffiliateProducts();
    });
})();
