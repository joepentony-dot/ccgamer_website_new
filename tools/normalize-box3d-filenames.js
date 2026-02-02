#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const BOXES_DIR = path.resolve(__dirname, "..", "resources", "images", "games", "boxes-3d");

async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    } catch (error) {
        return false;
    }
}

async function getDirectoryEntries(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

async function normalizeFilenames() {
    const files = await getDirectoryEntries(BOXES_DIR);
    const uppercaseFiles = files.filter((file) => /[A-Z]/.test(file));

    if (uppercaseFiles.length === 0) {
        console.log("No uppercase filenames detected. No changes made.");
        return { renamed: [], skipped: [] };
    }

    const conflicts = [];
    for (const file of uppercaseFiles) {
        const lower = file.toLowerCase();
        if (file !== lower && files.includes(lower)) {
            conflicts.push({ original: file, conflict: lower });
        }
    }

    if (conflicts.length > 0) {
        console.error("Conflicts detected. Aborting.");
        for (const conflict of conflicts) {
            console.error(`- ${conflict.original} conflicts with existing ${conflict.conflict}`);
        }
        process.exitCode = 1;
        return { renamed: [], skipped: [] };
    }

    const renamed = [];
    const skipped = [];

    for (const file of uppercaseFiles) {
        const lower = file.toLowerCase();
        if (file === lower) {
            skipped.push(file);
            continue;
        }

        const sourcePath = path.join(BOXES_DIR, file);
        const tempName = `temp_${lower}`;
        const tempPath = path.join(BOXES_DIR, tempName);
        const targetPath = path.join(BOXES_DIR, lower);

        if (await fileExists(targetPath)) {
            console.error(`Conflict detected: ${lower} already exists. Aborting.`);
            process.exitCode = 1;
            return { renamed: [], skipped: [] };
        }

        if (await fileExists(tempPath)) {
            console.error(`Temporary file already exists: ${tempName}. Aborting.`);
            process.exitCode = 1;
            return { renamed: [], skipped: [] };
        }

        await fs.promises.rename(sourcePath, tempPath);
        await fs.promises.rename(tempPath, targetPath);
        renamed.push({ from: file, temp: tempName, to: lower });
    }

    console.log("Rename report:");
    for (const entry of renamed) {
        console.log(`- ${entry.from} -> ${entry.temp} -> ${entry.to}`);
    }

    return { renamed, skipped };
}

normalizeFilenames().catch((error) => {
    console.error("Error normalizing filenames:", error);
    process.exitCode = 1;
});
