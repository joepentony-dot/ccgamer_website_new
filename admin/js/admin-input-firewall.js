(() => {
  if (window.CCG_ADMIN_INPUT_FIREWALL) {
    console.assert(
      window.CCG_ADMIN_INPUT_FIREWALL === true,
      '[CCG-ADMIN] Firewall missing'
    );
    return;
  }

  window.CCG_ADMIN_INPUT_FIREWALL = true;

  const isEditableTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, [contenteditable]'));
  };

  const stopAdminInputHandlers = (event) => {
    if (!isEditableTarget(event.target)) return;
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  ['keydown', 'keypress', 'keyup'].forEach((eventType) => {
    document.addEventListener(eventType, stopAdminInputHandlers, true);
  });

  console.info('[CCG-ADMIN] Input firewall active');
  console.assert(
    window.CCG_ADMIN_INPUT_FIREWALL === true,
    '[CCG-ADMIN] Firewall missing'
  );
})();
