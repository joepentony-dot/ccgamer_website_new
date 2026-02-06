// CCG ADMIN LOCK — DO NOT REMOVE — INPUT HARDENING
(() => {
  const editableSelector = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

  const isDebugEnabled = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('debugkeys') === '1' || window.localStorage.getItem('ccgDebugKeys') === '1';
    } catch (error) {
      return false;
    }
  };

  const logOnce = (() => {
    const logged = new Set();
    return (key, message) => {
      if (!isDebugEnabled()) return;
      if (logged.has(key)) return;
      logged.add(key);
      console.info(message);
    };
  })();

  const isEditableElement = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.matches(editableSelector)) return true;
    if (target.isContentEditable && !target.matches('[contenteditable="false"]')) return true;
    return Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
  };

  const isEditableEvent = (event) => {
    if (!event) return false;
    if (isEditableElement(event.target)) return true;
    if (typeof event.composedPath === 'function') {
      return event.composedPath().some(isEditableElement);
    }
    return false;
  };

  const isSpaceKey = (event) => event && (event.key === ' ' || event.code === 'Space' || event.key === 'Spacebar' || event.keyCode === 32);

  const hardenAdminInputs = (event) => {
    // Allow normal typing in form fields
    if (isEditableEvent(event)) {
      if (isSpaceKey(event)) {
        logOnce('ccg-admin-harden-space-editable', '[CCG-ADMIN] Input hardening skipped Space key inside editable element.');
      }
      return;
    }

    if (isSpaceKey(event)) {
      logOnce('ccg-admin-harden-space-block', '[CCG-ADMIN] Input hardening intercepted Space on non-editable target.');
    }

    // Block only non-input shortcuts
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  document.addEventListener('keydown', hardenAdminInputs);
  document.addEventListener('keypress', hardenAdminInputs);
  document.addEventListener('keyup', hardenAdminInputs);

  window.CCG_ADMIN_INPUT_HARDENED = true;
  logOnce('ccg-admin-harden-active', '[CCG-ADMIN] Input hardening active (bubble phase).');
})();
