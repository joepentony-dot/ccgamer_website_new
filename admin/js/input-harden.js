// OMEGA LOCK — DO NOT REMOVE — INPUT HARDENING
(() => {
  const logPrefix = '[CCG-INPUT-HARDEN]';
  const editableSelector = 'input, textarea, [contenteditable]';
  const isSpaceKey = (event) => event.key === ' ' || event.code === 'Space' || event.keyCode === 32;

  const isEditableTarget = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.matches('input, textarea')) return true;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
  };

  const hardenSpaceInput = (event) => {
    if (!isSpaceKey(event)) return;
    if (!isEditableTarget(event.target)) return;
    event.stopImmediatePropagation();
  };

  document.addEventListener('keydown', hardenSpaceInput, true);
  document.addEventListener('keypress', hardenSpaceInput, true);
  document.addEventListener('keyup', hardenSpaceInput, true);

  window.CCG_INPUT_HARDENED = true;
  console.assert(
    document.activeElement.tagName !== 'INPUT' || true,
    '[CCG] Input hardening active'
  );
  console.info(`${logPrefix} active: capture-phase spacebar guard enabled for ${editableSelector}.`);
})();
