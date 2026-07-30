export const EASTER_EGG_REGISTRY = Object.freeze([
    { code: "sys64738", label: "SYS64738", category: "system", desktop: true, mobile: true, reducedMotion: "static-compatible", runtime: "external" },
    { code: "pressplay", label: "PRESS PLAY", category: "commodore", desktop: true, mobile: true, reducedMotion: "media-controls", runtime: "local" },
    { code: "load", label: "LOAD", category: "commodore", desktop: true, mobile: true, reducedMotion: "supported", runtime: "local", phase: "E1" },
    { code: "basic", label: "BASIC", category: "commodore", desktop: true, mobile: true, reducedMotion: "supported", runtime: "local", phase: "E2" },
    { code: "vhs", label: "VHS", category: "video", desktop: true, mobile: true, reducedMotion: "media-controls", runtime: "local" },
    { code: "terminator", label: "TERMINATOR", category: "audio", desktop: true, mobile: true, reducedMotion: "audio-only", runtime: "local" },
    { code: "bsod", label: "BSOD", category: "system", desktop: true, mobile: true, reducedMotion: "static-compatible", runtime: "local" },
    { code: "mario", label: "MARIO", category: "audio", desktop: true, mobile: true, reducedMotion: "audio-only", runtime: "local" },
    { code: "nokia", label: "NOKIA", category: "audio", desktop: true, mobile: true, reducedMotion: "audio-only", runtime: "local" },
    { code: "sonic", label: "SONIC", category: "audio", desktop: true, mobile: true, reducedMotion: "limited-animation", runtime: "local" },
    { code: "warp", label: "WARP", category: "system", desktop: true, mobile: true, reducedMotion: "supported", runtime: "local" },
    { code: "party", label: "PARTY", category: "video", desktop: true, mobile: true, reducedMotion: "manual-play", runtime: "local" },
    { code: "zxspectrum", label: "ZX SPECTRUM", category: "computer", desktop: true, mobile: true, reducedMotion: "media-controls", runtime: "external" },
    { code: "pacman", label: "PACMAN", category: "game", desktop: true, mobile: true, reducedMotion: "game-controlled", runtime: "local" },
    { code: "boing", label: "BOING", category: "amiga", desktop: true, mobile: true, reducedMotion: "manual-play", runtime: "local" },
    { code: "matrix", label: "MATRIX", category: "video", desktop: true, mobile: true, reducedMotion: "media-controls", runtime: "local" },
    { code: "invaders", label: "INVADERS", category: "game", desktop: true, mobile: false, reducedMotion: "game-controlled", runtime: "external" },
    { code: "heman", label: "HE-MAN", category: "video", desktop: true, mobile: true, reducedMotion: "media-controls", runtime: "local" },
    { code: "lemmings", label: "LEMMINGS", category: "amiga", desktop: true, mobile: true, reducedMotion: "media-controls", runtime: "local" },
    { code: "cheeky", label: "CHEEKY", category: "hidden", desktop: true, mobile: true, reducedMotion: "audio-only", runtime: "external-redirect", hidden: true },
    { code: "konamicode", label: "KONAMI CODE", category: "hidden", desktop: true, mobile: false, reducedMotion: "media-controls", runtime: "local", hidden: true }
]);

export const EASTER_EGG_BY_CODE = new Map(EASTER_EGG_REGISTRY.map(entry => [entry.code, entry]));

export function getEasterEggMetadata(code) {
    return EASTER_EGG_BY_CODE.get(String(code || "").toLowerCase().replace(/\s+/g, "")) || null;
}

export function listEasterEggs({ includeHidden = false, platform = "all" } = {}) {
    return EASTER_EGG_REGISTRY.filter(entry => {
        if (!includeHidden && entry.hidden) return false;
        if (platform === "desktop" && !entry.desktop) return false;
        if (platform === "mobile" && !entry.mobile) return false;
        return true;
    });
}
