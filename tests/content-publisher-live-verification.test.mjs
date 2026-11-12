import assert from 'node:assert/strict';
import test from 'node:test';
import { publishedGamePageMatches, savedRevisionMatchesLive, normaliseDeployedGameHtml } from '../admin/js/content-publisher-live-verification.mjs';

const url = 'https://www.cheekycommodoregamer.co.uk/games/gloom/';
const published = `<!doctype html><html lang="en"><head>
  <link rel="canonical" href="${url}">
  <meta property="og:url" content="${url}">
  <title>Gloom (1995) – Amiga</title>
</head><body><h1>Gloom</h1></body></html>`;

test('Gloom canonical fixture is recognised as deployed and refreshable', () => {
  assert.equal(publishedGamePageMatches(published, 'gloom'), true,
    'Published game verification must retain canonical and OpenGraph route');
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


test('existing-game recovery requires current-main ancestry and exact deployed bytes', () => {
  assert.equal(savedRevisionMatchesLive({
    liveHtml: published,
    repositoryHtml: published,
    comparison: { status: 'ahead', behind_by: 0 },
    pageCommitComparison: { status: 'ahead', behind_by: 0, ahead_by: 1 }
  }), true);
  // The edit's source commit is on main, but its page still comes from a
  // pre-edit commit. That must not be mistaken for a published revision.
  assert.equal(savedRevisionMatchesLive({
    liveHtml: published,
    repositoryHtml: published,
    comparison: { status: 'ahead', behind_by: 0 },
    pageCommitComparison: { status: 'behind', behind_by: 1, ahead_by: 0 }
  }), false);
  assert.equal(savedRevisionMatchesLive({
    liveHtml: published,
    repositoryHtml: published,
    comparison: { status: 'ahead', behind_by: 0 }
  }), false);
  assert.equal(savedRevisionMatchesLive({
    liveHtml: published,
    repositoryHtml: published,
    comparison: { status: 'ahead', behind_by: 0 },
    pageCommitComparison: { status: 'identical', behind_by: 0, ahead_by: 0 }
  }), false);
  assert.equal(savedRevisionMatchesLive({
    liveHtml: published,
    repositoryHtml: published + ' stale',
    comparison: { status: 'ahead', behind_by: 0 }
  }), false);
  assert.equal(savedRevisionMatchesLive({
    liveHtml: published,
    repositoryHtml: published,
    comparison: { status: 'behind', behind_by: 0 }
  }), false);
  assert.equal(savedRevisionMatchesLive({
    liveHtml: published,
    repositoryHtml: published,
    comparison: { status: 'diverged', behind_by: 2 }
  }), false);
});

test('deployed first-paint 3D box prefill is reversible without weakening exact page comparison', () => {
  const repositoryHtml = published.replace('<h1>Gloom</h1>',
    '<section class="game-hero"><div class="game-hero__box3d" hidden><img class="game-hero__box3d-img" alt=""></div></section><h1>Gloom</h1>');
  const deployedHtml = repositoryHtml
    .replace('<section class="game-hero">',
      '<section class="game-hero game-hero--has-box3d" data-ccg-box3d-prefilled="true">')
    .replace('class="game-hero__box3d" hidden', 'class="game-hero__box3d"')
    .replace('<img class="game-hero__box3d-img" alt="">',
      '<img class="game-hero__box3d-img" src="/resources/images/games/boxes-3d/gloom.webp" alt="3D box artwork for gloom">');
  const verified = {
    repositoryHtml, slug: 'gloom',
    comparison: { status: 'ahead', behind_by: 0 },
    pageCommitComparison: { status: 'ahead', behind_by: 0, ahead_by: 1 }
  };
  assert.equal(normaliseDeployedGameHtml(deployedHtml, 'gloom'), repositoryHtml);
  assert.equal(savedRevisionMatchesLive({ ...verified, liveHtml: deployedHtml }), true);
  assert.equal(savedRevisionMatchesLive({ ...verified, liveHtml: repositoryHtml }), true);

  // Altering the published game, artwork, or prefill marker must not pass.
  assert.equal(savedRevisionMatchesLive({
    ...verified, liveHtml: deployedHtml.replace('Gloom (1995)', 'Gloom Deluxe (1996)')
  }), false);
  assert.equal(savedRevisionMatchesLive({
    ...verified, liveHtml: deployedHtml.replace('boxes-3d/gloom.webp', 'boxes-3d/other.webp')
  }), false);
  assert.equal(savedRevisionMatchesLive({
    ...verified, liveHtml: deployedHtml.replace('data-ccg-box3d-prefilled="true"', 'data-ccg-box3d-prefilled="false"')
  }), false);
  assert.equal(savedRevisionMatchesLive({
    ...verified, liveHtml: deployedHtml, slug: 'heimdall'
  }), false);
});
