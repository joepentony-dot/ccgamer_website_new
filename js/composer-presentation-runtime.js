(function () {
  "use strict";

  const pageRoot = document.querySelector('.ccg-composer-page');
  if (!pageRoot || document.documentElement?.getAttribute('data-ccg-page') !== 'music-composer') return;

  const composerName = String(
    pageRoot.getAttribute('data-composer-name')
    || document.querySelector('.ccg-composer-profile__title')?.textContent
    || ''
  ).trim();
  if (!composerName) return;

  function getMeta(selector) {
    return document.querySelector(selector)?.getAttribute('content') || '';
  }

  const snapshot = {
    title: document.title,
    description: getMeta('meta[name="description"]'),
    ogTitle: getMeta('meta[property="og:title"]'),
    ogDescription: getMeta('meta[property="og:description"]'),
    twitterTitle: getMeta('meta[name="twitter:title"]'),
    twitterDescription: getMeta('meta[name="twitter:description"]'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    ogUrl: getMeta('meta[property="og:url"]')
  };

  function restoreMeta(selector, value) {
    if (!value) return;
    const node = document.querySelector(selector);
    if (node && node.getAttribute('content') !== value) node.setAttribute('content', value);
  }

  function normalizeComposerPresentation() {
    document.querySelectorAll('.ccg-composer-profile__platform, .ccg-composer-profile__facts, .ccg-composer-subtitle')
      .forEach((node) => node.remove());

    const heading = document.querySelector('.ccg-composer-title');
    const expectedHeading = `${composerName} — Game Music`;
    if (heading && heading.textContent.trim() !== expectedHeading) heading.textContent = expectedHeading;

    const intro = document.querySelector('.ccg-composer-intro');
    const expectedIntro = `Explore music, soundtracks and audio work by ${composerName}, with linked game pages and playable tracks where available.`;
    if (intro && intro.textContent.trim() !== expectedIntro) intro.textContent = expectedIntro;

    const musicList = document.getElementById('composer-games');
    if (musicList) {
      const sectionHeading = Array.from(document.querySelectorAll('h2.ccg-composer-section-title'))
        .find((node) => node.id !== 'other-composers-heading' && node.compareDocumentPosition(musicList) & Node.DOCUMENT_POSITION_FOLLOWING);
      const expectedSection = `${composerName} Music`;
      if (sectionHeading && sectionHeading.textContent.trim() !== expectedSection) sectionHeading.textContent = expectedSection;
    }

    const dynamicComposerSchema = document.getElementById('ccg-schema-composer');
    if (dynamicComposerSchema) dynamicComposerSchema.remove();

    if (snapshot.title && document.title !== snapshot.title) document.title = snapshot.title;
    restoreMeta('meta[name="description"]', snapshot.description);
    restoreMeta('meta[property="og:title"]', snapshot.ogTitle);
    restoreMeta('meta[property="og:description"]', snapshot.ogDescription);
    restoreMeta('meta[name="twitter:title"]', snapshot.twitterTitle);
    restoreMeta('meta[name="twitter:description"]', snapshot.twitterDescription);
    restoreMeta('meta[property="og:url"]', snapshot.ogUrl);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && snapshot.canonical && canonical.getAttribute('href') !== snapshot.canonical) {
      canonical.setAttribute('href', snapshot.canonical);
    }
  }

  let queued = false;
  function scheduleNormalize() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      normalizeComposerPresentation();
    });
  }

  const observer = new MutationObserver(scheduleNormalize);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['content', 'href']
  });

  normalizeComposerPresentation();
  document.addEventListener('DOMContentLoaded', scheduleNormalize, { once: true });
  window.addEventListener('load', scheduleNormalize, { once: true });
  window.setTimeout(scheduleNormalize, 250);
  window.setTimeout(scheduleNormalize, 1000);
})();
