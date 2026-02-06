(() => {
  // OMEGA LOCK: Do not remove. Prevents global key handler regressions.
  const logPrefix = '[OMEGA-INPUT-FIX]';
  const editableSelector = 'input, textarea, [contenteditable]';

  const isEditableTarget = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.matches('input, textarea')) return true;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
  };

  const isSpaceKey = (event) => event.key === ' ' || event.code === 'Space' || event.keyCode === 32;

  const allowSpaceInEditable = (event) => {
    if (event.target.closest('input, textarea, [contenteditable]')) return;
    if (!isSpaceKey(event)) return;
    if (!isEditableTarget(event.target)) return;
    event.stopPropagation();
  };

  document.addEventListener('keydown', allowSpaceInEditable, true);
  document.addEventListener('keypress', allowSpaceInEditable, true);

  console.info(`${logPrefix} active: spacebar input guard enabled for ${editableSelector}.`);
})();
