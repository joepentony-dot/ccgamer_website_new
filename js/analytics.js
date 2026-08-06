/* =========================================================
   CCG CONSENT-FIRST ANALYTICS + MONETISATION BOOTSTRAP
   ---------------------------------------------------------
   - Google Analytics remains disabled until consent.
   - Essential preferences remain available without consent.
   - Adds site-wide legal, shop and supporter links without
     editing every generated archive page.
   - Labels Amazon affiliate links and adds the required
     disclosure near affiliate content.
   - Adds restrained passive-revenue prompts to suitable pages.
   ========================================================= */

(function () {
  'use strict';

  var CONSENT_KEY = 'ccg-consent-v1';
  var CONSENT_VERSION = '2026-08-06';
  var GA_ID = 'G-GT1JB7HMQ4';
  var PUBLIC_ROOT = '/';
  var FOURTHWALL_URL = 'https://cheeky-commodore-gamer-shop.fourthwall.com/?utm_source=ccg_website&utm_medium=referral&utm_campaign=sitewide_shop';
  var isAdmin = window.location.pathname.indexOf('/admin/') === 0;
  var isIntro = document.documentElement.getAttribute('data-ccg-page') === 'intro';

  if (isAdmin || isIntro) return;
  if (window.ccgConsentBootstrapLoaded) return;
  window.ccgConsentBootstrapLoaded = true;

  function loadStylesheet(href, marker) {
    if (document.querySelector('link[' + marker + ']')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(marker, 'true');
    document.head.appendChild(link);
  }

  function loadStylesheets() {
    loadStylesheet(PUBLIC_ROOT + 'resources/css/ccg-monetisation.css', 'data-ccg-monetisation-css');
    loadStylesheet(PUBLIC_ROOT + 'resources/css/passive-income.css', 'data-ccg-passive-income-css');
  }

  function safeParse(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function defaultConsent() {
    return {
      version: CONSENT_VERSION,
      essential: true,
      analytics: false,
      advertising: false,
      decided: false,
      updatedAt: null
    };
  }

  function readConsent() {
    var stored = null;
    try {
      stored = safeParse(window.localStorage.getItem(CONSENT_KEY));
    } catch (error) {
      stored = null;
    }

    if (!stored || stored.version !== CONSENT_VERSION) {
      return defaultConsent();
    }

    return {
      version: CONSENT_VERSION,
      essential: true,
      analytics: stored.analytics === true,
      advertising: stored.advertising === true,
      decided: stored.decided === true,
      updatedAt: stored.updatedAt || null
    };
  }

  function writeConsent(next) {
    var normalized = {
      version: CONSENT_VERSION,
      essential: true,
      analytics: next.analytics === true,
      advertising: next.advertising === true,
      decided: true,
      updatedAt: new Date().toISOString()
    };

    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(normalized));
    } catch (error) {
      // Consent still applies for the current page if storage is unavailable.
    }

    window.ccgConsentState = normalized;
    applyConsent(normalized);
    closeConsentUi();
    window.dispatchEvent(new CustomEvent('ccg-consent-changed', { detail: normalized }));
    return normalized;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  function loadGoogleAnalytics() {
    if (window.ccgAnalyticsLoaded) return;
    window.ccgAnalyticsLoaded = true;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    script.setAttribute('data-ccg-analytics', 'google-analytics');
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function applyConsent(state) {
    window.gtag('consent', 'update', {
      analytics_storage: state.analytics ? 'granted' : 'denied',
      ad_storage: state.advertising ? 'granted' : 'denied',
      ad_user_data: state.advertising ? 'granted' : 'denied',
      ad_personalization: state.advertising ? 'granted' : 'denied'
    });

    document.documentElement.setAttribute('data-ccg-consent-analytics', state.analytics ? 'granted' : 'denied');
    document.documentElement.setAttribute('data-ccg-consent-advertising', state.advertising ? 'granted' : 'denied');

    if (state.analytics) loadGoogleAnalytics();
  }

  function createButton(label, className, handler) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function closeConsentUi() {
    document.querySelectorAll('[data-ccg-consent-ui]').forEach(function (node) {
      node.remove();
    });
    document.documentElement.classList.remove('ccg-consent-open');
  }

  function showPreferences() {
    closeConsentUi();
    document.documentElement.classList.add('ccg-consent-open');

    var state = window.ccgConsentState || readConsent();
    var overlay = document.createElement('div');
    overlay.className = 'ccg-consent-overlay';
    overlay.setAttribute('data-ccg-consent-ui', 'preferences');

    var dialog = document.createElement('section');
    dialog.className = 'ccg-consent-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'ccg-consent-title');

    dialog.innerHTML = [
      '<div class="ccg-consent-dialog__header">',
      '  <div>',
      '    <p class="ccg-consent-kicker">Privacy controls</p>',
      '    <h2 id="ccg-consent-title">Choose your preferences</h2>',
      '  </div>',
      '  <button type="button" class="ccg-consent-close" aria-label="Close privacy preferences">×</button>',
      '</div>',
      '<p class="ccg-consent-copy">Essential storage keeps the site working and remembers choices such as C64 or Amiga mode. Optional analytics and advertising technologies remain off unless you enable them.</p>',
      '<div class="ccg-consent-options">',
      '  <label class="ccg-consent-option ccg-consent-option--locked">',
      '    <span><strong>Essential</strong><small>Site preferences, security and consent records.</small></span>',
      '    <input type="checkbox" checked disabled aria-label="Essential storage always enabled">',
      '  </label>',
      '  <label class="ccg-consent-option">',
      '    <span><strong>Analytics</strong><small>Helps measure visits and improve the archive.</small></span>',
      '    <input type="checkbox" data-ccg-consent-analytics>',
      '  </label>',
      '  <label class="ccg-consent-option">',
      '    <span><strong>Advertising</strong><small>Allows advertising measurement and personalised advertising if ads are introduced.</small></span>',
      '    <input type="checkbox" data-ccg-consent-advertising>',
      '  </label>',
      '</div>',
      '<p class="ccg-consent-links"><a href="/cookies.html">Cookie policy</a> · <a href="/privacy.html">Privacy policy</a></p>',
      '<div class="ccg-consent-actions" data-ccg-consent-actions></div>'
    ].join('');

    var analyticsInput = dialog.querySelector('[data-ccg-consent-analytics]');
    var advertisingInput = dialog.querySelector('[data-ccg-consent-advertising]');
    analyticsInput.checked = state.analytics === true;
    advertisingInput.checked = state.advertising === true;

    var actions = dialog.querySelector('[data-ccg-consent-actions]');
    actions.appendChild(createButton('Reject non-essential', 'ccg-consent-btn ccg-consent-btn--ghost', function () {
      writeConsent({ analytics: false, advertising: false });
    }));
    actions.appendChild(createButton('Save choices', 'ccg-consent-btn ccg-consent-btn--primary', function () {
      writeConsent({
        analytics: analyticsInput.checked,
        advertising: advertisingInput.checked
      });
    }));

    dialog.querySelector('.ccg-consent-close').addEventListener('click', closeConsentUi);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeConsentUi();
    });
    document.addEventListener('keydown', function escapeHandler(event) {
      if (event.key !== 'Escape' || !document.body.contains(overlay)) return;
      closeConsentUi();
      document.removeEventListener('keydown', escapeHandler);
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    dialog.querySelector('.ccg-consent-close').focus();
  }

  function showBanner() {
    if (document.querySelector('[data-ccg-consent-ui]')) return;

    var banner = document.createElement('section');
    banner.className = 'ccg-consent-banner';
    banner.setAttribute('data-ccg-consent-ui', 'banner');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Privacy and cookie choices');

    banner.innerHTML = [
      '<div class="ccg-consent-banner__copy">',
      '  <p class="ccg-consent-kicker">Your privacy choices</p>',
      '  <h2>Optional tracking stays off until you choose.</h2>',
      '  <p>Essential storage keeps the archive working. Google Analytics and future advertising technologies are disabled unless you accept them.</p>',
      '  <p class="ccg-consent-links"><a href="/cookies.html">Cookie policy</a> · <a href="/privacy.html">Privacy policy</a></p>',
      '</div>',
      '<div class="ccg-consent-actions" data-ccg-consent-actions></div>'
    ].join('');

    var actions = banner.querySelector('[data-ccg-consent-actions]');
    actions.appendChild(createButton('Reject non-essential', 'ccg-consent-btn ccg-consent-btn--ghost', function () {
      writeConsent({ analytics: false, advertising: false });
    }));
    actions.appendChild(createButton('Manage choices', 'ccg-consent-btn ccg-consent-btn--secondary', showPreferences));
    actions.appendChild(createButton('Accept all', 'ccg-consent-btn ccg-consent-btn--primary', function () {
      writeConsent({ analytics: true, advertising: true });
    }));

    document.body.appendChild(banner);
  }

  function appendFooterLinks() {
    var footer = document.querySelector('.ccg-footer');
    if (!footer || footer.querySelector('[data-ccg-legal-links]')) return;

    var nav = document.createElement('nav');
    nav.className = 'ccg-footer-legal';
    nav.setAttribute('data-ccg-legal-links', 'true');
    nav.setAttribute('aria-label', 'Legal, privacy, shop and support');
    nav.innerHTML = [
      '<a href="/shop.html">Shop</a>',
      '<a href="/supporters.html">Hall of Fame</a>',
      '<a href="/support.html">Support CCG</a>',
      '<a href="/privacy.html">Privacy</a>',
      '<a href="/cookies.html">Cookies</a>',
      '<a href="/affiliate-disclosure.html">Affiliate disclosure</a>',
      '<a href="/terms.html">Terms</a>',
      '<a href="/copyright.html">Copyright</a>',
      '<a href="/work-with-ccg.html">Work with CCG</a>',
      '<button type="button" data-ccg-open-consent>Privacy choices</button>'
    ].join('');

    nav.querySelector('[data-ccg-open-consent]').addEventListener('click', showPreferences);
    footer.appendChild(nav);
  }

  function isAmazonAffiliateLink(link) {
    try {
      var host = new URL(link.href, window.location.href).hostname.toLowerCase();
      return host === 'amzn.to' || host.indexOf('amazon.') !== -1;
    } catch (error) {
      return false;
    }
  }

  function labelAffiliateLinks() {
    var links = Array.prototype.slice.call(document.querySelectorAll('a[href]')).filter(isAmazonAffiliateLink);
    if (!links.length) return;

    links.forEach(function (link) {
      var rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('sponsored');
      rel.add('nofollow');
      rel.add('noopener');
      link.setAttribute('rel', Array.from(rel).join(' '));
      link.setAttribute('data-ccg-affiliate-link', 'amazon');
      link.setAttribute('data-ccg-revenue-link', 'amazon-affiliate');
      if (!link.getAttribute('target')) link.setAttribute('target', '_blank');

      if (!link.nextElementSibling || !link.nextElementSibling.matches('.ccg-affiliate-label')) {
        var label = document.createElement('span');
        label.className = 'ccg-affiliate-label';
        label.textContent = 'Paid link';
        label.setAttribute('aria-label', 'Affiliate paid link');
        link.insertAdjacentElement('afterend', label);
      }
    });

    if (!document.querySelector('[data-ccg-affiliate-disclosure]')) {
      var disclosure = document.createElement('aside');
      disclosure.className = 'ccg-affiliate-disclosure';
      disclosure.setAttribute('data-ccg-affiliate-disclosure', 'true');
      disclosure.innerHTML = '<strong>Affiliate disclosure:</strong> As an Amazon Associate I earn from qualifying purchases. Affiliate links may earn the site a commission at no additional cost to you. <a href="/affiliate-disclosure.html">Read the full disclosure.</a>';
      var first = links[0];
      var container = first.closest('section, article, main, .ccg-info-panel, .ccg-info-card') || first.parentElement;
      if (container) container.insertBefore(disclosure, container.firstChild);
    }
  }

  function usePrivacyEnhancedYouTube() {
    document.querySelectorAll('iframe[src*="youtube.com/embed/"]').forEach(function (frame) {
      try {
        var url = new URL(frame.src);
        url.hostname = 'www.youtube-nocookie.com';
        frame.src = url.toString();
        frame.setAttribute('loading', frame.getAttribute('loading') || 'lazy');
        frame.setAttribute('referrerpolicy', frame.getAttribute('referrerpolicy') || 'strict-origin-when-cross-origin');
      } catch (error) {
        // Leave malformed or non-standard embeds untouched.
      }
    });
  }

  function shouldShowPassivePanel() {
    var path = (window.location.pathname || '/').toLowerCase();
    var page = (document.documentElement.getAttribute('data-ccg-page') || '').toLowerCase();
    var excludedPages = new Set([
      'shop', 'supporters', 'support', 'privacy', 'cookies', 'terms',
      'copyright', 'affiliate-disclosure', 'work-with-ccg', 'login',
      'register', 'member-hub', 'contact'
    ]);
    var excludedPrefixes = ['/admin/', '/auth/', '/community/', '/games/downloads/', '/quiz/'];

    if (excludedPages.has(page)) return false;
    if (excludedPrefixes.some(function (prefix) { return path.indexOf(prefix) === 0; })) return false;
    return Boolean(document.querySelector('main') && document.querySelector('.ccg-footer'));
  }

  function appendPassiveRevenuePanel() {
    if (!shouldShowPassivePanel()) return;
    if (document.querySelector('[data-ccg-passive-revenue-panel]')) return;

    var footer = document.querySelector('.ccg-footer');
    if (!footer || !footer.parentNode) return;

    var panel = document.createElement('aside');
    panel.className = 'ccg-passive-revenue-panel';
    panel.setAttribute('data-ccg-passive-revenue-panel', 'true');
    panel.setAttribute('aria-label', 'Support Cheeky Commodore Gamer');
    panel.innerHTML = [
      '<div class="ccg-passive-revenue-panel__copy">',
      '  <strong>Enjoying the archive?</strong>',
      '  <span>Support CCG by visiting the official shop, joining Patreon or viewing the supporter Hall of Fame.</span>',
      '</div>',
      '<div class="ccg-passive-revenue-panel__actions">',
      '  <a href="' + FOURTHWALL_URL + '" target="_blank" rel="noopener noreferrer" data-ccg-revenue-link="fourthwall-sitewide">Official Shop</a>',
      '  <a href="/support.html">Support CCG</a>',
      '  <a href="/supporters.html">Hall of Fame</a>',
      '</div>'
    ].join('');

    footer.parentNode.insertBefore(panel, footer);
  }

  function trackRevenueLinks() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[data-ccg-revenue-link]');
      if (!link) return;
      if (!window.ccgConsentState || !window.ccgConsentState.analytics) return;

      window.gtag('event', 'ccg_revenue_click', {
        revenue_route: link.getAttribute('data-ccg-revenue-link') || 'unknown',
        link_url: link.href,
        page_path: window.location.pathname
      });
    });
  }

  function loadMemberHallOfFamePreference() {
    var path = (window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/community/profile.html' && path !== '/community/profile') return;
    if (document.querySelector('script[data-ccg-hall-preference]')) return;

    var script = document.createElement('script');
    script.src = '/resources/js/auth/hall-of-fame-preference.js';
    script.defer = true;
    script.setAttribute('data-ccg-hall-preference', 'true');
    document.body.appendChild(script);
  }

  function initDomFeatures() {
    appendFooterLinks();
    labelAffiliateLinks();
    usePrivacyEnhancedYouTube();
    appendPassiveRevenuePanel();
    trackRevenueLinks();
    loadMemberHallOfFamePreference();
    if (!window.ccgConsentState.decided) showBanner();
  }

  loadStylesheets();
  window.ccgConsentState = readConsent();
  applyConsent(window.ccgConsentState);

  window.CCGConsent = {
    get: function () {
      return Object.assign({}, window.ccgConsentState);
    },
    open: showPreferences,
    acceptAll: function () {
      return writeConsent({ analytics: true, advertising: true });
    },
    rejectNonEssential: function () {
      return writeConsent({ analytics: false, advertising: false });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDomFeatures, { once: true });
  } else {
    initDomFeatures();
  }
})();
