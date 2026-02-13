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

  const isTypingKey = (event) => {
    if (!event) return false;
    if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) return true;
    return typeof event.key === 'string' && event.key.length === 1;
  };

  const captureListener = (event) => {
    if (!window.ccgIsEditableTarget || !window.ccgIsEditableTarget(event.target)) return;
    if (!isTypingKey(event)) return;

    // Legacy input safety now only prevents global hotkeys by stopping propagation.
    event.stopPropagation();
    console.info(`${logPrefix} editable key event isolated from global handlers.`);
  };

  ['keydown', 'keypress', 'keyup'].forEach((eventType) => {
    document.addEventListener(eventType, captureListener, true);
  });
})();
