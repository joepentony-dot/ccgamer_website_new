/* CCG E11 C64 NIGHTMARES protected PDF Easter egg */
import { createDriveDocumentExperience } from "./document-viewer.js";

const DRIVE_PREVIEW_URL = "https://drive.google.com/file/d/1URmXhKAS62KjI0Pl_m4Fo595e4TS_uqa/preview";

export function createExperience() {
    return createDriveDocumentExperience({
        code: "nightmare",
        title: "C64 NIGHTMARES",
        subtitle: "ANDREW FISHER • FUSION RETRO BOOKS",
        previewUrl: DRIVE_PREVIEW_URL,
    });
}
