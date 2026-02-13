(() => {
  const logPrefix = '[CCG-INPUT-SAFETY]';

  const isDebugEnabled = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('debug') === '1' || window.localStorage.getItem('ccgDebugInputSafety') === '1';
    } catch (_error) {
      return false;
    }
  };

  const isAdminContext = () => {
    const body = document.body;
    return Boolean(body && (body.dataset.ccgContext === 'admin' || body.classList.contains('ccg-admin')));
  };

  if (!isDebugEnabled() || !isAdminContext()) {
    return;
  }

  const isIdentityTarget = (target) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    if (window.ccgIsGameEditorIdentityTarget) {
      return window.ccgIsGameEditorIdentityTarget(target);
    }
    return Boolean(
      target.closest('[data-field="title"]')
      || target.closest('[data-field="slug"]')
      || target.closest('[data-field="id"]')
      || target.closest('[data-lock-toggle]')
    );
  };

  const logOnce = (() => {
    const logged = new Set();
    return (key, message, level = 'info') => {
      if (logged.has(key)) return;
      logged.add(key);
      if (level === 'warn') {
        console.warn(message);
        return;
      }
      console.info(message);
    };
  })();

  const isTypingKey = (event) => {
    if (!event) return false;
    if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) return true;
    return typeof event.key === 'string' && event.key.length === 1;
  };

  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function patchedPreventDefault(...args) {
    if (this instanceof KeyboardEvent && isTypingKey(this)) {
      if (window.ccgIsEditableTarget && window.ccgIsEditableTarget(this.target)) {
        if (!isIdentityTarget(this.target)) {
          logOnce('ccg-prevent-default-editable', `${logPrefix} preventDefault called on editable key event.`, 'warn');
        }
      }
    }
    return originalPreventDefault.apply(this, args);
  };

  const captureListener = (event) => {
    if (!window.ccgIsEditableTarget || !window.ccgIsEditableTarget(event.target)) return;
    if (!isTypingKey(event)) return;
    if (event.defaultPrevented && !isIdentityTarget(event.target)) {
      logOnce('ccg-default-prevented', `${logPrefix} typing key default prevented on editable target.`, 'warn');
    }
  };

  ['keydown', 'keypress', 'keyup'].forEach((eventType) => {
    document.addEventListener(eventType, captureListener, true);
  });
})();
