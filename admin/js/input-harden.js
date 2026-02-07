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
    if (typeof event.composedPath === 'function' && event.composedPath().some(isEditableElement)) {
      return true;
    }
    return false;
  };

  const hasEditableFocus = () => isEditableElement(document.activeElement);

  const isSpaceKey = (event) => event && (event.key === ' ' || event.code === 'Space' || event.key === 'Spacebar' || event.keyCode === 32);

  const hardenAdminInputs = (event) => {
    // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
    // Prevents quiz/hotkey logic from blocking form typing
    const tag = event.target?.tagName?.toLowerCase();
    const isEditable = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable === true;
    if (isEditable) return;

    // Allow normal typing in form fields
    if (isEditableEvent(event) || hasEditableFocus()) {
      return;
    }

    if (isSpaceKey(event)) {
      return;
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
