import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseSource,
  normaliseAndFilterEvents,
  buildRss
} from '../scripts/sync-retro-directory-events.mjs';

test('parses JSON and keeps future UK events only', function () {
  const body = JSON.stringify({
    events: [
      {
        name: 'North Bristol Retro Meet',
        url: 'https://retro.directory/browse/events/999-north-bristol-retro-meet',
        startDate: '2026-10-07',
        location: {
          name: 'Example Hall',
          address: {
            addressLocality: 'Bristol',
            addressCountry: 'United Kingdom'
          }
        },
        category: 'Gathering/Meeting'
      },
      {
        name: 'US Event',
        url: 'https://retro.directory/browse/events/998-us-event',
        startDate: '2026-10-08',
        location: {
          address: {
            addressLocality: 'Portland',
            addressCountry: 'United States'
          }
        }
      },
      {
        name: 'Old UK Event',
        url: 'https://retro.directory/browse/events/997-old-event',
        startDate: '2025-01-01',
        country: 'United Kingdom'
      }
    ]
  });

  const raw = parseSource(body, 'application/json');
  const events = normaliseAndFilterEvents(raw, { today: '2026-10-05' });

  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'North Bristol Retro Meet');
  assert.equal(events[0].startDate, '2026-10-07');
  assert.match(events[0].location, /Bristol/);
});

test('parses RSS-style XML with namespaced event dates', function () {
  const body = [
    '<?xml version="1.0"?>',
    '<rss xmlns:event="urn:event">',
    '<channel>',
    '<item>',
    '<title>Kickstart Amiga User Group Meetup</title>',
    '<link>https://retro.directory/browse/events/1000-kickstart</link>',
    '<event:start>11th Oct 2026</event:start>',
    '<location>Ottershaw, Surrey, KT16 0HG, United Kingdom</location>',
    '<category>Gathering/Meeting</category>',
    '</item>',
    '</channel>',
    '</rss>'
  ].join('');

  const raw = parseSource(body, 'application/rss+xml');
  const events = normaliseAndFilterEvents(raw, { today: '2026-10-05' });

  assert.equal(events.length, 1);
  assert.equal(events[0].startDate, '2026-10-11');
  assert.match(events[0].sourceUrl, /retro\.directory/);
});

test('builds an RSS feed that links back to the source event', function () {
  const rss = buildRss({
    updatedAt: '2026-10-05T12:00:00.000Z',
    events: [
      {
        id: 'abc123',
        title: 'Example Retro Event',
        startDate: '2026-10-10',
        endDate: '',
        location: 'Leicester, United Kingdom',
        category: 'Special Event',
        sourceUrl: 'https://retro.directory/browse/events/123-example'
      }
    ]
  });

  assert.match(rss, /Example Retro Event/);
  assert.match(rss, /retro\.directory\/browse\/events\/123-example/);
  assert.match(rss, /ccg:eventStart>2026-10-10/);
});
