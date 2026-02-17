import test from 'node:test';
import assert from 'node:assert/strict';

import { canAddTopPick, deriveTopPickSlugs } from '../resources/js/auth/profile-page.js';

test('users can mark exactly 10 top picks', () => {
  assert.equal(canAddTopPick(0), true);
  assert.equal(canAddTopPick(9), true);
  assert.equal(canAddTopPick(10), false);
});

test('deriveTopPickSlugs keeps valid game slugs only', () => {
  const set = deriveTopPickSlugs([
    { game_slug: 'wizball' },
    { game_slug: '  ' },
    { game_slug: 'wizball' },
    { game_slug: 'elite' }
  ]);

  assert.deepEqual([...set], ['wizball', 'elite']);
});

test('favourite removal compatibility: deleting a slug from set removes top-pick state', () => {
  const picks = deriveTopPickSlugs([{ game_slug: 'bubble-bobble' }, { game_slug: 'ik-plus' }]);
  picks.delete('ik-plus');

  assert.equal(picks.has('ik-plus'), false);
  assert.equal(picks.has('bubble-bobble'), true);
});
