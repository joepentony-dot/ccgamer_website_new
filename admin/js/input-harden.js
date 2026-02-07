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
