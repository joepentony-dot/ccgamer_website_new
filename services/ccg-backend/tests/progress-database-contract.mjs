import assert from 'node:assert/strict';
import { createDatabase } from '../src/db.mjs';
import { createLostSizzlerProgressStore } from '../src/lost-sizzler-progress.mjs';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the progress database contract.');

const database = createDatabase(databaseUrl);
const progress = createLostSizzlerProgressStore(database);
const userId = 'progress-database-contract-user';

try {
  await database.query('delete from lost_sizzler_collection_state where user_id = $1', [userId]);
  await database.query('delete from lost_sizzler_achievements where user_id = $1', [userId]);
  await database.query('delete from ccg_users where user_id = $1', [userId]);

  const initialAchievements = await progress.listAchievements(userId);
  assert.deepEqual(initialAchievements, []);

  const firstUnlock = await progress.unlockAchievement(userId, {
    achievement_key: 'solo.floor-5',
    unlocked_at: '2036-02-05T12:00:00.000Z',
    metadata: { floor: 5 },
  });
  assert.equal(firstUnlock.achievement_key, 'solo.floor-5');
  assert.equal(firstUnlock.idempotent, false);

  const repeatedUnlock = await progress.unlockAchievement(userId, {
    achievement_key: 'solo.floor-5',
    unlocked_at: '2036-02-05T12:00:00.000Z',
    metadata: { floor: 5 },
  });
  assert.equal(repeatedUnlock.idempotent, true);

  const enrichedUnlock = await progress.unlockAchievement(userId, {
    achievement_key: 'solo.floor-5',
    unlocked_at: '2036-02-04T12:00:00.000Z',
    metadata: { mode: 'solo' },
  });
  assert.equal(new Date(enrichedUnlock.unlocked_at).toISOString(), '2036-02-04T12:00:00.000Z');
  assert.deepEqual(enrichedUnlock.metadata, { floor: 5, mode: 'solo' });

  const secondUnlock = await progress.unlockAchievement(userId, {
    achievement_key: 'collection.first-disk',
    unlocked_at: '2036-02-06T12:00:00.000Z',
    metadata: {},
  });
  assert.equal(secondUnlock.idempotent, false);

  const achievements = await progress.listAchievements(userId);
  assert.equal(achievements.length, 2);
  assert.equal(achievements[0].achievement_key, 'solo.floor-5');
  assert.equal(achievements[1].achievement_key, 'collection.first-disk');

  assert.equal(await progress.getCollection(userId), null);

  const created = await progress.putCollection(userId, {
    expected_revision: 0,
    payload: { unlocked: ['disk-1'], dossier: { viewed: true } },
  });
  assert.equal(created.revision, 1);
  assert.equal(created.idempotent, false);

  const exactRetry = await progress.putCollection(userId, {
    expected_revision: 0,
    payload: { dossier: { viewed: true }, unlocked: ['disk-1'] },
  });
  assert.equal(exactRetry.revision, 1);
  assert.equal(exactRetry.idempotent, true);

  await assert.rejects(
    progress.putCollection(userId, {
      expected_revision: 0,
      payload: { unlocked: ['disk-1', 'disk-2'] },
    }),
    (error) => error?.statusCode === 409 && error?.code === 'collection_revision_conflict'
  );

  const afterConflict = await progress.getCollection(userId);
  assert.equal(afterConflict.revision, 1);
  assert.deepEqual(afterConflict.payload, { dossier: { viewed: true }, unlocked: ['disk-1'] });

  const updated = await progress.putCollection(userId, {
    expected_revision: 1,
    payload: { unlocked: ['disk-1', 'disk-2'], dossier: { viewed: true } },
  });
  assert.equal(updated.revision, 2);
  assert.equal(updated.idempotent, false);

  const stored = await progress.getCollection(userId);
  assert.equal(stored.revision, 2);
  assert.deepEqual(stored.payload, { dossier: { viewed: true }, unlocked: ['disk-1', 'disk-2'] });

  console.log('Lost Sizzler progress PostgreSQL contract passed: achievement sync is monotonic/idempotent and collection writes use conflict-safe revisions without touching local state.');
} finally {
  await database.close();
}
