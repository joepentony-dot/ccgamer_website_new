(() => {
  // CCG ADMIN LOCK: Do not remove. Prevents global key handler regressions.
  const logPrefix = '[CCG-INPUT-FIX]';

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

  logOnce('ccg-input-fix-active', `${logPrefix} active: spacebar guard removed to allow typing and scrolling everywhere.`);
})();
