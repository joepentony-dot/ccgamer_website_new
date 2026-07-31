#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const sourceManifestPath = path.join(repoRoot, "data", "publisher-logo-sources.json");
const publisherImagesDir = path.join(repoRoot, "resources", "images", "publishers");
const publisherPagesDir = path.join(repoRoot, "games", "publishers");
const refreshExisting = process.env.CCG_REFRESH_PUBLISHER_LOGOS === "1";
const strictMode = process.env.CCG_PUBLISHER_LOGOS_STRICT === "1";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [".webp", ".png", ".svg", ".jpg", ".jpeg"];

function fail(message) {
    console.error(`[publisher-logo-fetch] ${message}`);
    process.exit(1);
}

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
}

function existingLogoPath(slug) {
    for (const extension of SUPPORTED_EXTENSIONS) {
        const candidate = path.join(publisherImagesDir, `${slug}${extension}`);
        if (fs.existsSync(candidate)) return candidate;
    }
    return "";
}

function extensionFromMime(mime, url) {
    const normalized = String(mime || "").toLowerCase();
    if (normalized === "image/webp") return ".webp";
    if (normalized === "image/png") return ".png";
    if (normalized === "image/svg+xml") return ".svg";
    if (normalized === "image/jpeg") return ".jpg";

    try {
        const extension = path.extname(new URL(url).pathname).toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(extension) ? extension : "";
    } catch {
        return "";
    }
}

function commonsApiUrl(fileTitle) {
    const apiUrl = new URL("https://commons.wikimedia.org/w/api.php");
    apiUrl.searchParams.set("action", "query");
    apiUrl.searchParams.set("format", "json");
    apiUrl.searchParams.set("formatversion", "2");
    apiUrl.searchParams.set("prop", "imageinfo");
    apiUrl.searchParams.set("iiprop", "url|mime|size");
    apiUrl.searchParams.set("titles", fileTitle);
    return apiUrl;
}

async function resolveCommonsFile(fileTitle) {
    const response = await fetch(commonsApiUrl(fileTitle), {
        headers: {
            "User-Agent": "CheekyCommodoreGamerPublisherLogoFetcher/1.0"
        }
    });

    if (!response.ok) {
        throw new Error(`Commons API returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const page = payload?.query?.pages?.[0];
    const image = page?.imageinfo?.[0];

    if (!image?.url) {
        throw new Error(`Commons could not resolve ${fileTitle}`);
    }

    return image;
}

async function downloadFile(url, outputPath) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "CheekyCommodoreGamerPublisherLogoFetcher/1.0"
        },
        redirect: "follow"
    });

    if (!response.ok) {
        throw new Error(`Logo download returned HTTP ${response.status}`);
    }

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_FILE_BYTES) {
        throw new Error(`Logo is larger than ${MAX_FILE_BYTES} bytes`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error("Downloaded logo was empty");
    if (bytes.length > MAX_FILE_BYTES) {
        throw new Error(`Logo is larger than ${MAX_FILE_BYTES} bytes`);
    }

    fs.writeFileSync(outputPath, bytes);
    return bytes.length;
}

async function processSource(source) {
    const slug = String(source?.slug || "").trim();
    const fileTitle = String(source?.fileTitle || "").trim();

    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error("Manifest entry has an invalid slug");
    }
    if (!fileTitle.startsWith("File:")) {
        throw new Error(`${slug} does not provide a Wikimedia Commons File: title`);
    }

    const publisherPage = path.join(publisherPagesDir, slug, "index.html");
    if (!fs.existsSync(publisherPage)) {
        return { slug, status: "skipped", detail: "publisher page is not present" };
    }

    const currentPath = existingLogoPath(slug);
    if (currentPath && !refreshExisting) {
        return {
            slug,
            status: "kept",
            detail: path.relative(repoRoot, currentPath)
        };
    }

    const image = await resolveCommonsFile(fileTitle);
    const extension = extensionFromMime(image.mime, image.url);
    if (!extension) {
        throw new Error(`${slug} resolved to unsupported MIME type ${image.mime || "unknown"}`);
    }

    fs.mkdirSync(publisherImagesDir, { recursive: true });
    const outputPath = path.join(publisherImagesDir, `${slug}${extension}`);
    const temporaryPath = `${outputPath}.download`;

    try {
        const size = await downloadFile(image.url, temporaryPath);

        if (refreshExisting) {
            SUPPORTED_EXTENSIONS.forEach((candidateExtension) => {
                const candidate = path.join(publisherImagesDir, `${slug}${candidateExtension}`);
                if (candidate !== outputPath && fs.existsSync(candidate)) fs.unlinkSync(candidate);
            });
        }

        fs.renameSync(temporaryPath, outputPath);
        return {
            slug,
            status: "downloaded",
            detail: `${path.relative(repoRoot, outputPath)} (${size} bytes)`
        };
    } finally {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    }
}

async function main() {
    if (!fs.existsSync(sourceManifestPath)) {
        fail(`Missing ${path.relative(repoRoot, sourceManifestPath)}`);
    }

    const manifest = readJson(sourceManifestPath);
    const sources = Array.isArray(manifest) ? manifest : manifest?.sources;
    if (!Array.isArray(sources)) {
        fail("Publisher logo source manifest must contain a sources array.");
    }

    const enabledSources = sources.filter((source) => source?.enabled !== false);
    const results = [];
    const failures = [];

    for (const source of enabledSources) {
        try {
            const result = await processSource(source);
            results.push(result);
            console.log(`[publisher-logo-fetch] ${result.slug}: ${result.status} — ${result.detail}`);
        } catch (error) {
            const slug = String(source?.slug || "unknown");
            failures.push({ slug, message: error.message });
            console.warn(`[publisher-logo-fetch] ${slug}: ${error.message}`);
        }
    }

    const downloaded = results.filter((result) => result.status === "downloaded").length;
    const kept = results.filter((result) => result.status === "kept").length;
    const skipped = results.filter((result) => result.status === "skipped").length;

    console.log(
        `[publisher-logo-fetch] Complete: ${downloaded} downloaded, ${kept} already present, ${skipped} skipped, ${failures.length} failed.`
    );

    if (strictMode && failures.length) process.exitCode = 1;
}

main().catch((error) => fail(error.stack || error.message));
