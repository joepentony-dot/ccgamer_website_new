(function () {
  const PROFILE_KEY = 'ccg-user-profile';
  const RATINGS_KEY = 'ccg-user-ratings';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function getProfile() {
    return read(PROFILE_KEY, { nickname: '' });
  }

  function setNickname(nickname) {
    return write(PROFILE_KEY, { nickname: String(nickname || '').trim() });
  }

  function signOut() {
    return write(PROFILE_KEY, { nickname: '' });
  }

  function getRatings() {
    const data = read(RATINGS_KEY, {});
    return data && typeof data === 'object' ? data : {};
  }

  function getRating(slug) {
    const ratings = getRatings();
    return Number(ratings[slug]) || 0;
  }

  function setRating(slug, value) {
    if (!slug) return false;
    const score = Math.max(1, Math.min(10, Number(value) || 0));
    if (!score) return false;
    const ratings = getRatings();
    ratings[slug] = score;
    return write(RATINGS_KEY, ratings);
  }

  function exportRatings() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: getProfile(),
      ratings: getRatings()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ccg-user-ratings.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importRatings(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid ratings payload.');
    const profile = parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : { nickname: '' };
    const ratings = parsed.ratings && typeof parsed.ratings === 'object' ? parsed.ratings : {};
    write(PROFILE_KEY, profile);
    write(RATINGS_KEY, ratings);
    return true;
  }

  window.CCGUserRatings = {
    getProfile,
    setNickname,
    signOut,
    getRatings,
    getRating,
    setRating,
    exportRatings,
    importRatings
  };
})();
