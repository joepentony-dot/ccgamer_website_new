// CCG ADMIN LOCK — DO NOT REMOVE — INPUT HARDENING
(() => {
  const editableSelector = 'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable]';
  const logOnce = (() => {
    const logged = new Set();
    return (message) => {
      if (logged.has(message)) return;
      logged.add(message);
      console.log(message);
    };
  })();

  const isEditableTarget = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.matches('input, textarea')) return true;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
  };

  const hardenAdminInputs = (event) => {
    if (!isEditableTarget(event.target)) return;
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  document.addEventListener('keydown', hardenAdminInputs, true);
  document.addEventListener('keypress', hardenAdminInputs, true);
  document.addEventListener('keyup', hardenAdminInputs, true);

  window.CCG_ADMIN_INPUT_HARDENED = true;
  logOnce('[CCG-ADMIN] Input hardening active');
  logOnce('[CCG-ADMIN] Context=admin (safe mode)');
  console.info(`[CCG-ADMIN] capture-phase input guard enabled for ${editableSelector}.`);
})();
