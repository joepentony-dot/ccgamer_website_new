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

  const isPrintableKey = (event) => {
    if (!event) return false;
    if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) return true;
    return typeof event.key === 'string' && event.key.length === 1;
  };

  const isAdminEditableEvent = (event) => {
    if (!(event instanceof KeyboardEvent)) return false;
    if (!window.ccgIsAdminContext || !window.ccgIsAdminContext()) return false;
    if (!window.ccgIsEditableTarget || !window.ccgIsEditableTarget(event.target)) return false;
    return isPrintableKey(event);
  };

  if (!Event.prototype.__ccgAdminInputShield) {
    const originalPreventDefault = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function patchedPreventDefault(...args) {
      if (isAdminEditableEvent(this)) {
        return;
      }
      return originalPreventDefault.apply(this, args);
    };
    Event.prototype.__ccgAdminInputShield = true;
  }

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
