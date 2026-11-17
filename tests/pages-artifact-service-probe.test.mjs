import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { waitForArtifact } = require('../scripts/wait-for-pages-artifact-service.cjs');

const expected = 'github-pages-2';
const noSleep = async () => {};

test('internal service retries missing metadata then accepts only the exact attempt', async () => {
  let calls = 0;
  const result = await waitForArtifact({
    artifactName: expected, maxAttempts: 3, intervalMs: 0, sleep: noSleep,
    listArtifacts: async () => {
      calls++;
      return { artifacts: calls === 1
        ? [{ name: 'github-pages-1', id: 10 }]
        : [{ name: 'github-pages-1', id: 10 }, { name: expected, id: 23 }] };
    }
  });
  assert.deepEqual(result, { id: 23, attempt: 2 });
  assert.equal(calls, 2);
});

test('duplicate exact-attempt artifacts are rejected before deployment', async () => {
  await assert.rejects(waitForArtifact({ artifactName: expected,
    listArtifacts: async () => ({ artifacts: [
      { name: expected, id: 15 }, { name: expected, id: 16 }
    ] }) }), /Ambiguous current-attempt/);
});

test('zero artifacts or service failures never succeed', async () => {
  let count = 0;
  await assert.rejects(waitForArtifact({ artifactName: expected,
    maxAttempts: 3, intervalMs: 0, sleep: noSleep,
    listArtifacts: async () => { count++; if (count === 2) throw Error('temporary');
      return { artifacts: [] }; }
  }), /not visible in the deployment service/);
  assert.equal(count, 3);
});

test('invalid artifact identity fails closed', async () => {
  await assert.rejects(waitForArtifact({ artifactName: expected,
    listArtifacts: async () => ({ artifacts: [{ name: expected, id: 0 }] })
  }), /Invalid current-attempt/);
});

test('invalid attempt-scoped names are rejected', async () => {
  await assert.rejects(waitForArtifact({ artifactName: 'github-pages',
    listArtifacts: async () => ({ artifacts: [] })
  }), /Invalid Pages artifact/);
});
