#!/usr/bin/env node

"use strict";

const fs = require("fs");
const { execFileSync } = require("child_process");

const HOME_PATH = "home.html";
const EXPECTED = {
  title: "Commodore 64 &amp; Amiga Games, Reviews &amp; Retro Archive | Cheeky Commodore Gamer",
  description: "Explore Cheeky Commodore Gamer's Commodore 64 and Amiga archive: hundreds of games, reviews, videos, Zzap!64 awards, publishers, genres, quizzes, music and retro features.",
  canonical: "https://www.cheekycommodoregamer.co.uk/home.html",
  robots: "index,follow,max-image-preview:large,max-snippet:-1",
  ogUrl: "https://www.cheekycommodoregamer.co.uk/home.html",
  twitterUrl: "https://www.cheekycommodoregamer.co.uk/home.html"
};

function fail(message) {
  console.error(`[search-home-contract] ${message}`);
  process.exit(1);
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? match[2] : "";
}

function findTag(html, type, name) {
  if (type === "title") {
    const match = html.match(/<title>([\s\S]*?)<\/title>/i);
    return match ? match[1].trim() : "";
  }

  const tags = type === "link"
    ? [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0])
    : [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);

  if (type === "link") {
    return tags.find((tag) => getAttribute(tag, "rel").toLowerCase() === name.toLowerCase()) || "";
  }

  const separatorIndex = name.indexOf(":");
  if (separatorIndex < 1 || separatorIndex === name.length - 1) return "";
  const attribute = name.slice(0, separatorIndex);
  const value = name.slice(separatorIndex + 1);
  return tags.find((tag) => getAttribute(tag, attribute).toLowerCase() === value.toLowerCase()) || "";
}

function assertExactHead(html) {
  const title = findTag(html, "title", "");
  if (title !== EXPECTED.title) fail(`Unexpected title: ${title || "(missing)"}`);

  const descriptionTag = findTag(html, "meta", "name:description");
  if (getAttribute(descriptionTag, "content") !== EXPECTED.description) {
    fail("Meta description does not match the approved search-home copy.");
  }

  const robotsTag = findTag(html, "meta", "name:robots");
  if (getAttribute(robotsTag, "content") !== EXPECTED.robots) {
    fail("Robots directive does not match the approved search-home contract.");
  }

  const canonicalTag = findTag(html, "link", "canonical");
  if (getAttribute(canonicalTag, "href") !== EXPECTED.canonical) {
    fail("Canonical URL does not point to /home.html.");
  }

  const ogUrlTag = findTag(html, "meta", "property:og:url");
  if (getAttribute(ogUrlTag, "content") !== EXPECTED.ogUrl) {
    fail("og:url does not point to /home.html.");
  }

  const twitterUrlTag = findTag(html, "meta", "name:twitter:url");
  if (getAttribute(twitterUrlTag, "content") !== EXPECTED.twitterUrl) {
    fail("twitter:url does not point to /home.html.");
  }
}

function stripApprovedSeoHead(html) {
  return String(html)
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i, "")
    .replace(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i, "")
    .replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, "")
    .replace(/<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i, "")
    .replace(/<meta\b(?=[^>]*\bname=["']twitter:url["'])[^>]*>/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readBaseline() {
  const baselineFileArg = process.argv.find((arg) => arg.startsWith("--baseline-file="));
  if (baselineFileArg) {
    const baselineFile = baselineFileArg.slice("--baseline-file=".length);
    return fs.readFileSync(baselineFile, "utf8");
  }

  const baselineRefArg = process.argv.find((arg) => arg.startsWith("--baseline-ref="));
  const baselineRef = baselineRefArg ? baselineRefArg.slice("--baseline-ref=".length) : "origin/main";
  try {
    return execFileSync("git", ["show", `${baselineRef}:${HOME_PATH}`], { encoding: "utf8" });
  } catch (error) {
    fail(`Could not read baseline ${baselineRef}:${HOME_PATH}.`);
  }
}

if (!fs.existsSync(HOME_PATH)) fail(`${HOME_PATH} is missing.`);

const current = fs.readFileSync(HOME_PATH, "utf8");
const baseline = readBaseline();
assertExactHead(current);

if (stripApprovedSeoHead(current) !== stripApprovedSeoHead(baseline)) {
  fail("home.html changed outside the approved SEO-head fields.");
}

console.log("[search-home-contract] home.html differs from baseline only by the approved SEO-head migration.");