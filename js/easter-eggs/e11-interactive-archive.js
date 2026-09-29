/* CCG E11 interactive archive dispatcher */
const EXPERIENCE_MODULES = Object.freeze({
    bbs: "./e11/bbs.js",
    guru: "./e11/guru.js",
    sid: "./e11/sid-lab.js",
    "1541": "./e11/drive-1541.js",
    cracktro: "./e11/cracktro.js",
    workbench: "./e11/workbench.js",
    sprite: "./e11/sprite-editor.js",
    modem: "./e11/modem.js",
    readerror: "./e11/disk-error.js",
    kickstart: "./e11/kickstart.js",
});

export async function createE11Experience(code, options) {
    const normalized = String(code || "").toLowerCase().replace(/\s+/g, "");
    const modulePath = EXPERIENCE_MODULES[normalized];
    if (!modulePath) throw new Error("Unknown E11 experience: " + normalized);
    const experienceModule = await import(modulePath);
    if (typeof experienceModule.createExperience !== "function") {
        throw new Error("E11 module does not export createExperience: " + normalized);
    }
    return experienceModule.createExperience(options || {});
}

export const E11_CODES = Object.freeze(Object.keys(EXPERIENCE_MODULES));
