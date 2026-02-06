(() => {
  const existingFirewall = window.CCG_ADMIN_INPUT_FIREWALL;
  if (existingFirewall && existingFirewall.__initialized) {
    return;
  }

  const eventTypes = ['keydown', 'keypress', 'keyup'];
  let active = false;
  let disarmed = false;

  const isEditableTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, [contenteditable]'));
  };

  const stopAdminInputHandlers = (event) => {
    if (!isEditableTarget(event.target)) return;
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  const enable = () => {
    if (disarmed || active) return;
    eventTypes.forEach((eventType) => {
      document.addEventListener(eventType, stopAdminInputHandlers, true);
    });
    active = true;
  };

  const disable = () => {
    if (!active) return;
    eventTypes.forEach((eventType) => {
      document.removeEventListener(eventType, stopAdminInputHandlers, true);
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
