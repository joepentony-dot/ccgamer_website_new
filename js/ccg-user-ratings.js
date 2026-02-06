(function () {
  function noop() {
    return false;
  }

  function emptyProfile() {
    return { nickname: '' };
  }

  function emptyRatings() {
    return {};
  }

  async function unsupportedImport() {
    throw new Error('Local rating import is no longer supported. Ratings are saved to your account.');
  }

  window.CCGUserRatings = {
    getProfile: emptyProfile,
    setNickname: noop,
    signOut: noop,
    getRatings: emptyRatings,
    getRating: function () { return 0; },
    setRating: noop,
    exportRatings: noop,
    importRatings: unsupportedImport
  };
})();
