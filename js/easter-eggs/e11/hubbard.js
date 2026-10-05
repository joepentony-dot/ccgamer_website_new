/* CCG E11 ROB HUBBARD protected PDF Easter egg */
import { createDriveDocumentExperience } from "./document-viewer.js";

const DRIVE_PREVIEW_URL = "https://drive.google.com/file/d/1-anJeUpxQe8kzHDehawspQNgmhsUjjSv/preview";

export function createExperience() {
    return createDriveDocumentExperience({
        code: "hubbard",
        title: "ROB HUBBARD — MASTER OF MAGIC",
        subtitle: "C64AUDIO • READ ONLINE",
        previewUrl: DRIVE_PREVIEW_URL,
    });
}
