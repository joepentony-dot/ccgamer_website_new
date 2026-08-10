#!/usr/bin/env node

"use strict";

const matcher = require("../js/ccg-zzap64-matcher.js");

const BIBLE_URL = "https://www.zzap64.co.uk/cgi-bin/zzapbible.pl";
const DEFAULT_USER_AGENT = "CheekyCommodoreGamer-ZzapArchive/1.0 (+https://www.cheekycommodoregamer.co.uk/)";
const REQUEST_DELAY_MS = 650;
const FETCH_TIMEOUT_MS = 16000;
const MAX_ATTEMPTS = 3;

const requestCache = new Map();
let lastRequestAt = 0;

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreNumber(value) {
  const match = String(value || "").match(/(\d{1,3})\s*%/);
  return match ? Number(match[1]) : null;
}

function buildForm(query, issue) {
  return new URLSearchParams({
    game: `%${query}%`,
    company: "",
    score_selection: "equal to",
    score: "",
    issue_selection: "equal to",
    issue: String(issue),
    order_selection: "Page",
    Submit: "Search"
  }).toString();
}

async function postBible(query, issue, userAgent = DEFAULT_USER_AGENT) {
  const body = buildForm(query, issue);
  const cacheKey = `${issue}|${body}`;
  if (requestCache.has(cacheKey)) return requestCache.get(cacheKey);

  const task = (async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        lastRequestAt = Date.now();
        const response = await fetch(BIBLE_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,application/xhtml+xml",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      } catch (error) {
        lastError = error;
        if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error(`Zzap Bible request failed for “${query}” issue ${issue}: ${lastError?.message || lastError}`);
  })();

  requestCache.set(cacheKey, task);
  return task;
}

function rowCells(rowHtml) {
  const cells = [];
  const cellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match;
  while ((match = cellPattern.exec(String(rowHtml || "")))) {
    cells.push(stripTags(match[1]));
  }
  return cells;
}

function parseResultRows(html) {
  const results = [];
  const rows = String(html || "").match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

  rows.forEach((row) => {
    const cells = rowCells(row);
    if (cells.length < 6) return;

    for (let offset = 0; offset <= cells.length - 6; offset += 1) {
      const slice = cells.slice(offset, offset + 6);
      const [title, company, scoreText, issueText, pageText, reviewText] = slice;
      const issue = Number(issueText);
      const page = Number(pageText);
      if (!title || !Number.isInteger(issue) || issue < 1 || !Number.isInteger(page) || page < 1) continue;
      if (!/^(?:yes|no)$/i.test(reviewText)) continue;

      const key = `${matcher.canonicalTitle(title)}|${issue}|${page}`;
      if (results.some((item) => item.key === key)) continue;
      results.push({
        key,
        title,
        company,
        score: scoreNumber(scoreText),
        scoreText,
        issue,
        page,
        review: reviewText.toLowerCase()
      });
    }
  });

  return results;
}

function fallbackTextRows(html, issue) {
  const text = stripTags(html);
  const header = "Game Company Score Issue Page Review";
  const start = text.indexOf(header);
  if (start < 0) return [];

  const endMarkers = ["Total Reviews =", "Search the ZzapBible"];
  let end = text.length;
  endMarkers.forEach((marker) => {
    const pos = text.indexOf(marker, start + header.length);
    if (pos >= 0 && pos < end) end = pos;
  });

  const body = text.slice(start + header.length, end).trim();
  if (!body) return [];

  const pattern = new RegExp(`(.+?)\\s+(N\\/A|\\d{1,3}%)\\s+${Number(issue)}\\s+(\\d{1,3})\\s+(yes|no)(?=\\s|$)`, "gi");
  const matches = [];
  let match;
  while ((match = pattern.exec(body))) {
    const prefix = match[1].trim();
    const words = prefix.split(/\s+/);
    if (!words.length) continue;
    matches.push({
      key: `${matcher.canonicalTitle(prefix)}|${Number(issue)}|${Number(match[3])}`,
      title: prefix,
      company: "",
      score: scoreNumber(match[2]),
      scoreText: match[2],
      issue: Number(issue),
      page: Number(match[3]),
      review: match[4].toLowerCase()
    });
  }
  return matches;
}

function candidateScore(entry, candidate) {
  const titleScore = matcher.scoreGame(entry, {
    title: candidate.title,
    system: entry.system
  });
  const expectedScore = Number(entry.score);
  const scoreBonus = Number.isFinite(expectedScore) && Number.isFinite(candidate.score)
    ? (expectedScore === candidate.score ? 45 : -10)
    : 0;
  const reviewBonus = candidate.review === "yes" ? 8 : 0;
  return titleScore + scoreBonus + reviewBonus;
}

function selectCandidate(entry, candidates, issue) {
  const matchingIssue = candidates.filter((candidate) => Number(candidate.issue) === Number(issue));
  if (!matchingIssue.length) return null;
  if (matchingIssue.length === 1) return matchingIssue[0];

  const ranked = matchingIssue
    .map((candidate) => ({ candidate, score: candidateScore(entry, candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.page - b.candidate.page);

  if (!ranked.length) return null;
  if (ranked.length === 1 || ranked[0].score >= ranked[1].score + 8) return ranked[0].candidate;

  const exactCanonical = ranked.find(({ candidate }) => (
    matcher.canonicalTitle(candidate.title) === matcher.canonicalTitle(entry.title)
  ));
  return exactCanonical?.candidate || null;
}

function uniqueVariants(values) {
  const seen = new Set();
  return values.filter((value) => {
    const text = String(value || "").trim();
    const key = text.toLowerCase();
    if (!text || key.length < 2 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackVariants(title) {
  const raw = String(title || "").trim();
  return uniqueVariants([
    raw,
    raw.replace(/^(the|a|an)\s+/i, "").trim(),
    raw.split(":")[0].trim(),
    raw.replace(/[’‘`]/g, "'").replace(/[^A-Za-z0-9'+& -]+/g, " ").replace(/\s+/g, " ").trim(),
    matcher.canonicalTitle(raw)
  ]);
}

async function resolveReview({ entry, issue, searchVariants = [], userAgent = DEFAULT_USER_AGENT }) {
  const variants = uniqueVariants([...searchVariants, ...fallbackVariants(entry.title)]);

  for (const query of variants) {
    let html;
    try {
      html = await postBible(query, issue, userAgent);
    } catch (error) {
      console.warn(`[Zzap Bible] ${error.message}`);
      continue;
    }

    let candidates = parseResultRows(html);
    if (!candidates.length) candidates = fallbackTextRows(html, issue);
    const selected = selectCandidate(entry, candidates, issue);
    if (!selected) continue;

    return {
      issue: Number(issue),
      page: Number(selected.page),
      precision: "page",
      source: "official-zzap-bible",
      bibleTitle: selected.title,
      ...(selected.score !== null ? { bibleScore: selected.score } : {})
    };
  }

  return null;
}

module.exports = {
  BIBLE_URL,
  buildForm,
  fallbackTextRows,
  parseResultRows,
  resolveReview,
  selectCandidate
};
