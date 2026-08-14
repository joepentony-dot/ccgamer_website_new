"use strict";

const AUTHORISED_DOWNLOAD_STATUSES = new Set([
    "authorised",
    "public-domain",
    "freeware"
]);

function normalizeDownloadStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function hasAuthorisedDownload(game) {
    return AUTHORISED_DOWNLOAD_STATUSES.has(normalizeDownloadStatus(game?.download_status));
}

module.exports = {
    AUTHORISED_DOWNLOAD_STATUSES,
    normalizeDownloadStatus,
    hasAuthorisedDownload
};
