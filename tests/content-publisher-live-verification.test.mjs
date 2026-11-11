import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { publishedGamePageMatches } from '../admin/js/content-publisher-live-verification.mjs';

const url = 'https://www.cheekycommodoregamer.co.uk/games/gloom/';
const published = `<!doctype html><html lang="en"><head>
  <link rel="canonical" href="${url}">
  <meta property="og:url" content="${url}">
  <title>Gloom (1995) – Amiga</title>
</head><body><h1>Gloom</h1></body></html>`;

test('Gloom canonical page is recognised as deployed and refreshable', () => {
  assert.equal(publishedGamePageMatches(published, 'gloom'), true);
  const actual = fs.readFileSync('games/gloom/index.html', 'utf8');
  assert.equal(publishedGamePageMatches(actual, 'gloom'), true,
    'Published game generator must retain canonical and OpenGraph route');
});

test('an unrelated 200 response or redirected home shell never counts as a published game', () => {
  assert.equal(publishedGamePageMatches('<html><title>Home</title></html>', 'gloom'), false);
  assert.equal(publishedGamePageMatches(published, 'heimdall'), false);
  assert.equal(publishedGamePageMatches('<html><link rel="canonical" href="'+url+'"></html>', 'gloom'), false);
  assert.equal(publishedGamePageMatches('<html><meta property="og:url" content="'+url+'"></html>', 'gloom'), false);
  assert.equal(publishedGamePageMatches(published,'../gloom'),false);
});

test('canonical parser accepts attribute ordering without accepting the wrong URL', () => {
  const reordered = '<HTML><html><link href="'+url+'" rel="canonical"><meta content="'+url+'" property="og:url"></html>';
  assert.equal(publishedGamePageMatches(reordered,'gloom'),true);
  assert.equal(publishedGamePageMatches(reordered.replaceAll('/games/gloom/','/games/gloom-deluxe/'),'gloom'),false);
});
