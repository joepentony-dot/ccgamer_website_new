(() => {
  const existingFirewall = window.CCG_ADMIN_INPUT_FIREWALL;
  if (existingFirewall && existingFirewall.__initialized) {
    return;
  }

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

  function isGameEditorIdentityTarget(target) {
    if (!target || !(target instanceof HTMLElement)) return false;

    if (target.closest('[data-field="title"]')) return true;
    if (target.closest('[data-field="slug"]')) return true;
    if (target.closest('[data-field="id"]')) return true;
    if (target.closest('[data-lock-toggle]')) return true;

    return false;
  }

  const eventTypes = ['keydown', 'keypress', 'keyup'];
  let active = false;
  let disarmed = false;

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

  const isAllowedContext = () => {
    if (window.ccgIsAdminContext && window.ccgIsAdminContext()) return false;
    const body = document.body;
    const pathname = window.location?.pathname || '';
    if (body && body.classList.contains('ccg-quiz')) return true;
    return pathname.startsWith('/quiz/');
  };

  const stopAdminInputHandlers = (event) => {
    const pathname = window.location?.pathname || '';
    if (pathname.includes('/admin/games-editor.html') && isGameEditorIdentityTarget(event.target)) {
      return;
    }

    if (window.ccgIsEditableTarget && window.ccgIsEditableTarget(event.target)) return;
    logOnce('ccg-firewall-block', '[CCG] Input firewall intercepted non-editable key event.', 'warn');
  };

  const enable = () => {
    if (disarmed || active) return;
    if (!isAllowedContext()) return;
    eventTypes.forEach((eventType) => {
      document.addEventListener(eventType, stopAdminInputHandlers);
    });
    active = true;
    console.info('[CCG] Input firewall enabled');
  };

  const disable = () => {
    if (!active) return;
    eventTypes.forEach((eventType) => {
      document.removeEventListener(eventType, stopAdminInputHandlers);
    });
    active = false;
    disarmed = true;
    console.info('[CCG] Input firewall disabled');
  };

  const firewall = {
    __initialized: true,
    enable,
    disable,
    isActive: () => active,
    isDisarmed: () => disarmed
  };

  window.CCG_ADMIN_INPUT_FIREWALL = firewall;

  if (window.CCG_INPUT_FIREWALL_OPT_IN === true) {
    enable();
  }
})();
