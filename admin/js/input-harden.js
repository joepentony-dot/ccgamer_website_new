// CCG ADMIN LOCK — DO NOT REMOVE — INPUT SAFETY BOOTSTRAP
(() => {
  if (!window.ccgIsEditableTarget) {
    window.ccgIsEditableTarget = function ccgIsEditableTarget(target) {
      if (!target) return false;
      const tag = (target.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || target.isContentEditable === true;
    };
  }

  if (!window.ccgIsAdminContext) {
    window.ccgIsAdminContext = () => {
      const body = document.body;
      return Boolean(body && (body.dataset.ccgContext === 'admin' || body.classList.contains('ccg-admin')));
    };
  }

  if (!window.ccgIsGameEditorIdentityTarget) {
    window.ccgIsGameEditorIdentityTarget = function ccgIsGameEditorIdentityTarget(target) {
      if (!target || !(target instanceof HTMLElement)) return false;
      if (target.closest('[data-field="title"]')) return true;
      if (target.closest('[data-field="slug"]')) return true;
      if (target.closest('[data-field="id"]')) return true;
      if (target.closest('[data-lock-toggle]')) return true;
      return false;
    };
  }

  const isPrintableKey = (event) => {
    if (!event) return false;
    if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) return true;
    return typeof event.key === 'string' && event.key.length === 1;
  };

  const stopGlobalHotkeys = (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (!window.ccgIsAdminContext || !window.ccgIsAdminContext()) return;
    if (!window.ccgIsEditableTarget || !window.ccgIsEditableTarget(event.target)) return;
    if (!isPrintableKey(event)) return;

    // Only isolation behavior: do not mutate values for title/slug/id or any other input.
    event.stopPropagation();
  };

  ['keydown', 'keypress', 'keyup'].forEach((eventType) => {
    document.addEventListener(eventType, stopGlobalHotkeys, true);
  });

  const applyAdminContext = () => {
    window.CCG_CONTEXT = 'admin';
    const body = document.body;
    if (!body) return;
    body.classList.add('ccg-admin');
    body.dataset.ccgContext = 'admin';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAdminContext, { once: true });
  } else {
    applyAdminContext();
  }

  window.CCG_ADMIN_INPUT_HARDENED = true;
})();
