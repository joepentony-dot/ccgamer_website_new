#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const DATA_PATH = 'data/retro-directory-events.json';
const RSS_PATH = 'feeds/uk-retro-events.xml';
const SOURCE_NAME = 'retro.directory';
const SOURCE_BROWSE_URL = 'https://retro.directory/browse/events';
const SITE_ORIGIN = process.env.CCG_SITE_ORIGIN || 'https://www.cheekycommodoregamer.co.uk';
const PAGE_URL = SITE_ORIGIN + '/games/collections/retro-events.html';
const RSS_URL = SITE_ORIGIN + '/feeds/uk-retro-events.xml';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^$()|[\]{}]/g, '\\$&');
}

function decodeEntities(value) {
  return text(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, function (_, code) {
      return String.fromCodePoint(Number(code));
    })
    .replace(/&#x([0-9a-f]+);/gi, function (_, code) {
      return String.fromCodePoint(parseInt(code, 16));
    })
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function stripTags(value) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlEscape(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getXmlTag(block, names) {
  for (const name of names) {
    const safe = escapeRegExp(name);
    const pattern = new RegExp(
      '<(?:[\\w.-]+:)?' + safe + '\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + safe + '>',
      'i'
    );
    const match = block.match(pattern);
    if (match) return stripTags(match[1]);
  }
  return '';
}

function getXmlLink(block) {
  const href = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i);
  if (href) return decodeEntities(href[1]);

  const paired = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
  if (paired) return stripTags(paired[1]);

  return getXmlTag(block, ['guid', 'url']);
}

function parseXmlEvents(body) {
  const itemMatches = Array.from(body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi));
  const entryMatches = itemMatches.length
    ? itemMatches
    : Array.from(body.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi));

  return entryMatches.map(function (match) {
    const block = match[1];
    return {
      title: getXmlTag(block, ['title', 'name']),
      url: getXmlLink(block),
      startDate: getXmlTag(block, ['startDate', 'start', 'dtstart', 'date', 'pubDate', 'published']),
      endDate: getXmlTag(block, ['endDate', 'end', 'dtend']),
      venue: getXmlTag(block, ['venue']),
      city: getXmlTag(block, ['city', 'locality']),
      region: getXmlTag(block, ['region']),
      country: getXmlTag(block, ['country', 'addressCountry']),
      location: getXmlTag(block, ['location']),
      category: getXmlTag(block, ['category', 'type'])
    };
  });
}

function getPath(object, path) {
  let current = object;
  for (const part of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function firstValue(object, paths) {
  for (const path of paths) {
    const value = getPath(object, path);
    if (value !== undefined && value !== null && text(value)) return value;
  }
  return '';
}

function parseJsonEvents(body) {
  const parsed = JSON.parse(body);
  const rows = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed.events) ? parsed.events
      : (Array.isArray(parsed.items) ? parsed.items
        : (Array.isArray(parsed.entries) ? parsed.entries
          : (Array.isArray(parsed.data) ? parsed.data : []))));

  return rows.map(function (row) {
    const locationObject = row && typeof row.location === 'object' ? row.location : {};
    const addressObject = row && typeof row.address === 'object' ? row.address : {};
    const nestedAddress = locationObject && typeof locationObject.address === 'object'
      ? locationObject.address
      : {};

    return {
      title: firstValue(row, ['title', 'name', 'eventName']),
      url: firstValue(row, ['url', 'link', 'sourceUrl', 'eventUrl']),
      startDate: firstValue(row, ['startDate', 'start', 'date', 'eventDate', 'startsAt']),
      endDate: firstValue(row, ['endDate', 'end', 'endsAt']),
      venue: firstValue(row, ['venue', 'venueName', 'location.name']),
      city: firstValue(row, ['city', 'address.addressLocality', 'location.city', 'location.address.addressLocality']),
      region: firstValue(row, ['region', 'county', 'address.addressRegion', 'location.region', 'location.address.addressRegion']),
      country: firstValue(row, ['country', 'addressCountry', 'address.addressCountry', 'location.country', 'location.address.addressCountry']),
      postcode: firstValue(row, ['postcode', 'postalCode', 'address.postalCode', 'location.postcode', 'location.address.postalCode']),
      location: typeof row.location === 'string' ? row.location : firstValue(row, ['locationText']),
      category: firstValue(row, ['category', 'type', 'eventType'])
    };
  });
}

export function parseSource(body, contentType) {
  const source = text(body);
  const type = text(contentType).toLowerCase();
  const looksJson = type.includes('json') || source.startsWith('{') || source.startsWith('[');

  if (looksJson) return parseJsonEvents(source);
  return parseXmlEvents(source);
}

function normaliseDate(value) {
  const raw = text(value);
  if (!raw) return '';

  const ordinalFree = raw.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
  const isoDate = ordinalFree.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoDate) return isoDate[0];

  const date = new Date(ordinalFree);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function joinLocation(raw) {
  if (text(raw.location)) return text(raw.location);

  const parts = [
    text(raw.venue),
    text(raw.city),
    text(raw.region),
    text(raw.postcode),
    text(raw.country)
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(', ');
}

function isUkEvent(raw, location, assumeUk) {
  if (assumeUk) return true;

  const country = text(raw.country).toLowerCase();
  const haystack = (country + ' ' + text(location).toLowerCase()).trim();

  if (/\b(united kingdom|uk|u\.k\.|great britain|gb|gbr|england|scotland|wales|northern ireland)\b/i.test(haystack)) {
    return true;
  }

  return /\b(?:GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/i.test(text(location));
}

function absolutiseUrl(value) {
  const raw = text(value);
  if (!raw) return '';

  try {
    return new URL(raw, SOURCE_BROWSE_URL).toString();
  } catch (_) {
    return '';
  }
}

function makeId(event) {
  const basis = event.sourceUrl || [
    event.title,
    event.startDate,
    event.endDate,
    event.location
  ].join('|');

  return createHash('sha1').update(basis).digest('hex').slice(0, 16);
}

export function normaliseAndFilterEvents(rawEvents, options) {
  const settings = options || {};
  const assumeUk = settings.assumeUk === true;
  const today = (settings.today || new Date().toISOString().slice(0, 10)).slice(0, 10);

  const mapped = rawEvents.map(function (raw) {
    const title = text(raw.title);
    const startDate = normaliseDate(raw.startDate);
    const endDate = normaliseDate(raw.endDate);
    const location = joinLocation(raw);
    const sourceUrl = absolutiseUrl(raw.url);

    const event = {
      id: '',
      title: title,
      startDate: startDate,
      endDate: endDate,
      location: location,
      category: text(raw.category),
      sourceUrl: sourceUrl
    };

    event.id = makeId(event);
    event.isUk = isUkEvent(raw, location, assumeUk);
    return event;
  });

  const seen = new Set();

  return mapped
    .filter(function (event) {
      if (!event.title || !event.startDate || !event.sourceUrl || !event.isUk) return false;

      const lastDate = event.endDate || event.startDate;
      if (lastDate < today) return false;

      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .map(function (event) {
      const output = { ...event };
      delete output.isUk;
      return output;
    })
    .sort(function (a, b) {
      return a.startDate.localeCompare(b.startDate)
        || a.title.localeCompare(b.title, 'en-GB');
    });
}

function formatEventDate(event) {
  if (!event.endDate || event.endDate === event.startDate) return event.startDate;
  return event.startDate + ' to ' + event.endDate;
}

export function buildRss(data) {
  const buildDate = data.updatedAt ? new Date(data.updatedAt).toUTCString() : new Date().toUTCString();

  const items = data.events.map(function (event) {
    const descriptionParts = [formatEventDate(event)];
    if (event.location) descriptionParts.push(event.location);
    if (event.category) descriptionParts.push(event.category);

    const eventDate = new Date(event.startDate + 'T12:00:00Z').toUTCString();

    return [
      '    <item>',
      '      <title>' + xmlEscape(event.title) + '</title>',
      '      <link>' + xmlEscape(event.sourceUrl) + '</link>',
      '      <guid isPermaLink="false">' + xmlEscape('ccg-retro-event-' + event.id) + '</guid>',
      '      <description>' + xmlEscape(descriptionParts.join(' · ')) + '</description>',
      '      <pubDate>' + xmlEscape(eventDate) + '</pubDate>',
      '      <ccg:eventStart>' + xmlEscape(event.startDate) + '</ccg:eventStart>',
      event.endDate ? '      <ccg:eventEnd>' + xmlEscape(event.endDate) + '</ccg:eventEnd>' : '',
      event.location ? '      <ccg:location>' + xmlEscape(event.location) + '</ccg:location>' : '',
      '      <ccg:source>retro.directory</ccg:source>',
      '    </item>'
    ].filter(Boolean).join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:ccg="https://www.cheekycommodoregamer.co.uk/ns/retro-events">',
    '  <channel>',
    '    <title>Cheeky Commodore Gamer – Upcoming UK Retro Events</title>',
    '    <link>' + xmlEscape(PAGE_URL) + '</link>',
    '    <description>Upcoming UK retro gaming and computing events, linked to the original event entries on retro.directory.</description>',
    '    <language>en-gb</language>',
    '    <lastBuildDate>' + xmlEscape(buildDate) + '</lastBuildDate>',
    '    <atom:link href="' + xmlEscape(RSS_URL) + '" rel="self" type="application/rss+xml" />',
    items,
    '  </channel>',
    '</rss>',
    ''
  ].filter(function (line) { return line !== ''; }).join('\n');
}

async function readPreviousData() {
  try {
    return JSON.parse(await readFile(DATA_PATH, 'utf8'));
  } catch (_) {
    return {
      schemaVersion: 1,
      status: 'awaiting_authorised_feed',
      source: { name: SOURCE_NAME, url: SOURCE_BROWSE_URL },
      updatedAt: null,
      events: []
    };
  }
}

function eventListChanged(previous, nextEvents) {
  return JSON.stringify(Array.isArray(previous.events) ? previous.events : []) !== JSON.stringify(nextEvents);
}

async function postDiscordNotifications(newEvents) {
  const webhook = text(process.env.DISCORD_RETRO_EVENTS_WEBHOOK);
  if (!webhook || !newEvents.length) return;

  const maximum = 8;
  const toPost = newEvents.slice(0, maximum);

  for (const event of toPost) {
    const fields = [
      '**' + event.title + '**',
      'Date: ' + formatEventDate(event)
    ];

    if (event.location) fields.push('Location: ' + event.location);
    fields.push(event.sourceUrl);
    fields.push('Source: retro.directory');

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: 'CCG Retro Events',
          content: fields.join('\n'),
          allowed_mentions: { parse: [] }
        })
      });

      if (!response.ok) {
        console.warn('[retro-events] Discord webhook returned HTTP ' + response.status);
      }
    } catch (error) {
      console.warn('[retro-events] Discord notification failed:', error.message);
    }
  }

  if (newEvents.length > maximum) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: 'CCG Retro Events',
          content: 'There are ' + (newEvents.length - maximum) + ' additional new UK retro events. See ' + PAGE_URL,
          allowed_mentions: { parse: [] }
        })
      });
    } catch (_) {}
  }
}

async function main() {
  const feedUrl = text(process.env.RETRO_DIRECTORY_FEED_URL);
  if (!feedUrl) {
    console.log('[retro-events] RETRO_DIRECTORY_FEED_URL is not configured; no changes made.');
    return;
  }

  const parsedFeedUrl = new URL(feedUrl);
  if (parsedFeedUrl.protocol !== 'https:') {
    throw new Error('RETRO_DIRECTORY_FEED_URL must use HTTPS.');
  }

  const headers = {
    'user-agent': 'CheekyCommodoreGamer-RetroEvents/1.0 (+https://www.cheekycommodoregamer.co.uk/)'
  };

  const auth = text(process.env.RETRO_DIRECTORY_FEED_AUTH);
  if (auth) headers.authorization = auth;

  const response = await fetch(feedUrl, { headers: headers });
  if (!response.ok) {
    throw new Error('Retro.Directory feed returned HTTP ' + response.status);
  }

  const body = await response.text();
  const rawEvents = parseSource(body, response.headers.get('content-type') || '');
  if (!rawEvents.length) {
    throw new Error('Authorised feed contained no parseable event entries.');
  }

  const assumeUk = /^(1|true|yes)$/i.test(text(process.env.RETRO_DIRECTORY_ASSUME_UK));
  const events = normaliseAndFilterEvents(rawEvents, { assumeUk: assumeUk });

  if (!events.length && !/^(1|true|yes)$/i.test(text(process.env.RETRO_DIRECTORY_ALLOW_EMPTY))) {
    throw new Error('Feed produced no upcoming UK events. Set RETRO_DIRECTORY_ALLOW_EMPTY=true only when this is expected.');
  }

  const previous = await readPreviousData();
  const changed = eventListChanged(previous, events) || previous.status !== 'active';
  const updatedAt = changed
    ? new Date().toISOString()
    : (previous.updatedAt || new Date().toISOString());

  const next = {
    schemaVersion: 1,
    status: 'active',
    source: {
      name: SOURCE_NAME,
      url: SOURCE_BROWSE_URL
    },
    updatedAt: updatedAt,
    events: events
  };

  const previousIds = new Set(
    previous.status === 'active' && Array.isArray(previous.events)
      ? previous.events.map(function (event) { return event.id; })
      : []
  );

  const newEvents = previous.status === 'active'
    ? events.filter(function (event) { return !previousIds.has(event.id); })
    : [];

  await mkdir(dirname(DATA_PATH), { recursive: true });
  await mkdir(dirname(RSS_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
  await writeFile(RSS_PATH, buildRss(next), 'utf8');

  await postDiscordNotifications(newEvents);

  console.log('[retro-events] Active UK events: ' + events.length);
  console.log('[retro-events] New events for Discord: ' + newEvents.length);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch(function (error) {
    console.error('[retro-events] Sync failed:', error);
    process.exitCode = 1;
  });
}
