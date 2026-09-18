#!/usr/bin/env node

"use strict";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const DEFAULT_DELAY_MS = 700;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waybackAvailabilityUrl(url) {
  return `https://archive.org/wayback/available?url=${encodeURIComponent(String(url || "").trim())}`;
}

function parseWaybackSnapshot(payload) {
  const closest = payload?.archived_snapshots?.closest;
  if (!closest || closest.available !== true || String(closest.status || "") !== "200" || !closest.url) return null;
  return {
    url: String(closest.url),
    timestamp: String(closest.timestamp || "")
  };
}

function waybackRawUrl(snapshotUrl) {
  try {
    const parsed = new URL(String(snapshotUrl || ""));
    if (parsed.hostname.toLowerCase() !== "web.archive.org") return "";
    const match = parsed.pathname.match(/^\/web\/(\d{4,14})(?:[a-z_]+)?\/(https?:\/\/.*)$/i);
    if (!match) return "";
    return `https://web.archive.org/web/${match[1]}id_/${match[2]}`;
  } catch {
    return "";
  }
}

async function fetchResponse(url, options = {}) {
  const retries = Number.isInteger(options.retries) ? options.retries : DEFAULT_RETRIES;
  const timeoutMs = Number.isInteger(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : DEFAULT_DELAY_MS;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: options.headers || {}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(delayMs * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("request failed");
}

async function fetchText(url, options = {}) {
  const response = await fetchResponse(url, options);
  const text = await response.text();
  if (!text || text.length < 500) throw new Error("response was unexpectedly short");
  return text;
}

async function fetchJson(url, options = {}) {
  const response = await fetchResponse(url, options);
  return response.json();
}

async function fetchLemonHtml(url, options = {}) {
  const userAgent = String(options.userAgent || "CheekyCommodoreGamer-MagazineSource/1.0 (+https://www.cheekycommodoregamer.co.uk/)");
  const common = {
    retries: options.retries,
    timeoutMs: options.timeoutMs,
    delayMs: options.delayMs,
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-GB,en;q=0.9"
    }
  };

  let directError = null;
  try {
    const html = await fetchText(url, common);
    return { html, source: "live", sourceUrl: String(url) };
  } catch (error) {
    directError = error;
  }

  try {
    const availability = await fetchJson(waybackAvailabilityUrl(url), {
      retries: options.retries,
      timeoutMs: options.timeoutMs,
      delayMs: options.delayMs,
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json"
      }
    });
    const snapshot = parseWaybackSnapshot(availability);
    if (!snapshot) throw new Error("no archived snapshot is available");

    const rawUrl = waybackRawUrl(snapshot.url);
    if (!rawUrl) throw new Error("archived snapshot URL could not be normalised");

    const html = await fetchText(rawUrl, common);
    return {
      html,
      source: "wayback",
      sourceUrl: snapshot.url,
      rawUrl,
      timestamp: snapshot.timestamp
    };
  } catch (archiveError) {
    throw new Error(`live source failed (${directError?.message || "unknown error"}); archived fallback failed (${archiveError.message})`);
  }
}

module.exports = {
  fetchLemonHtml,
  parseWaybackSnapshot,
  waybackAvailabilityUrl,
  waybackRawUrl
};
