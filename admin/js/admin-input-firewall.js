(() => {
  const existingFirewall = window.CCG_ADMIN_INPUT_FIREWALL;
  if (existingFirewall && existingFirewall.__initialized) {
    return;
  }

  const eventTypes = ['keydown', 'keypress', 'keyup'];
  let active = false;
  let disarmed = false;

  const isAdminContext = () => window.location && window.location.pathname && window.location.pathname.startsWith('/admin/');

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
    return (key, message, level = 'info') => {
      if (!isDebugEnabled()) return;
      if (logged.has(key)) return;
      logged.add(key);
      if (level === 'warn') {
        console.warn(message);
        return;
      }
      console.info(message);
    };
  })();

  const editableSelector = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

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

  const stopAdminInputHandlers = (event) => {
    // ADMIN INPUT SAFETY LOCK — DO NOT REMOVE
    // Prevents quiz/hotkey logic from blocking form typing
    const tag = event.target?.tagName?.toLowerCase();
    const isEditable = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable === true;
    if (isEditable) return;

    // Never interfere with typing
    if (isEditableEvent(event) || hasEditableFocus()) {
      logOnce('ccg-admin-firewall-editable', '[CCG-ADMIN] Input firewall ignored editable key event.', 'warn');
      return;
    }

    if (isSpaceKey(event)) {
      return;
    }

    // Only block non-input shortcuts
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  const enable = () => {
    if (disarmed || active) return;
    if (isAdminContext()) {
      console.warn('[CCG-ADMIN] Input firewall running in admin context.');
    }
    eventTypes.forEach((eventType) => {
      document.addEventListener(eventType, stopAdminInputHandlers);
    });
    active = true;
  };

  const disable = () => {
    if (!active) return;
    eventTypes.forEach((eventType) => {
      document.removeEventListener(eventType, stopAdminInputHandlers);
    });
    active = false;
    disarmed = true;
    console.info('[CCG-ADMIN] Firewall disarmed');
  };

  const handleAuthReady = (context) => {
    if (disarmed) return;
    const role = context && context.role ? context.role : null;
    const session = context && context.session ? context.session : null;
    const user = context && context.user ? context.user : (session && session.user ? session.user : null);
    const isSuperadmin = role === 'superadmin';
    const hasSession = Boolean(user);
    if (hasSession && isSuperadmin) {
      disable();
      return;
    }
    enable();
  };

  const attachAuthReadyListener = () => {
    if (window.CCG_AUTH_READY && typeof window.CCG_AUTH_READY.then === 'function') {
      window.CCG_AUTH_READY.then(handleAuthReady).catch(() => {
        enable();
      });
      return;
    }

    window.addEventListener('ccg:auth-ready', (event) => {
      if (disarmed) return;
      if (window.ccgSupabase && typeof window.ccgSupabase.getCurrentUserContext === 'function') {
        window.ccgSupabase.getCurrentUserContext()
          .then(handleAuthReady)
          .catch(() => {
            enable();
          });
        return;
      }
      handleAuthReady(event && event.detail ? event.detail : null);
    }, { once: true });
  };

  const firewall = {
    __initialized: true,
    enable,
    disable,
    isActive: () => active,
    isDisarmed: () => disarmed
  };

  window.CCG_ADMIN_INPUT_FIREWALL = firewall;

  enable();
  attachAuthReadyListener();

  console.info('[CCG-ADMIN] Input firewall active');
  console.assert(
    window.CCG_ADMIN_INPUT_FIREWALL && window.CCG_ADMIN_INPUT_FIREWALL.__initialized,
    '[CCG-ADMIN] Firewall missing'
  );
})();
