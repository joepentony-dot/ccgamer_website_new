import assert from 'node:assert/strict';
import {
  validateAchievementUnlock,
  validateCollectionWrite,
} from '../src/lost-sizzler-progress.mjs';

const achievement = validateAchievementUnlock({
  achievement_key: 'solo.floor-5',
  unlocked_at: '2036-02-04T12:00:00.000Z',
  metadata: { floor: 5, mode: 'solo' },
});
assert.equal(achievement.achievementKey, 'solo.floor-5');
assert.equal(achievement.unlockedAt.toISOString(), '2036-02-04T12:00:00.000Z');
assert.deepEqual(achievement.metadata, { floor: 5, mode: 'solo' });

assert.throws(
  () => validateAchievementUnlock({ achievement_key: '../bad key' }),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_achievement_key'
);
assert.throws(
  () => validateAchievementUnlock({ achievement_key: 'valid', metadata: [] }),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_achievement_metadata'
);
assert.throws(
  () => validateAchievementUnlock({ achievement_key: 'valid', unlocked_at: 'not-a-date' }),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_achievement_unlocked_at'
);
assert.throws(
  () => validateAchievementUnlock({ achievement_key: 'valid', metadata: { value: 'x'.repeat(20_000) } }),
  (error) => error?.statusCode === 413 && error?.code === 'achievement_metadata_too_large'
);

const collection = validateCollectionWrite({
  expected_revision: 2,
  payload: { unlocked: ['disk-1'], dossier: { viewed: true } },
});
assert.equal(collection.expectedRevision, 2);
assert.deepEqual(collection.payload, { unlocked: ['disk-1'], dossier: { viewed: true } });
assert.equal(typeof collection.serialized, 'string');

assert.throws(
  () => validateCollectionWrite({ expected_revision: -1, payload: {} }),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_collection_expected_revision'
);
assert.throws(
  () => validateCollectionWrite({ expected_revision: 0, payload: [] }),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_collection_payload'
);
assert.throws(
  () => validateCollectionWrite({ expected_revision: 0, payload: { value: 'x'.repeat(300_000) } }),
  (error) => error?.statusCode === 413 && error?.code === 'collection_payload_too_large'
);

console.log('Lost Sizzler progress contract passed: achievement and collection payloads are bounded and revision writes are validated before persistence.');
