import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync('scripts/audit-external-links.js', 'utf8');

test('external link monitor is read-only against source data', () => {
  assert.match(script, /games\/games\.json/);
  assert.match(script, /data\/retro-specials\.json/);
  assert.doesNotMatch(script, /writeFileSync\([^,]+games\/games\.json/);
  assert.doesNotMatch(script, /unlinkSync|rmSync|renameSync/);
});

test('only repeated 404 or 410 responses are called confirmed broken', () => {
  assert.match(script, /status === 404 \|\| status === 410/);
  assert.match(script, /attempts: 2/);
  assert.match(script, /confirmed \? 'confirmed-broken' : 'unstable'/);
});

test('bot blocks and transient failures are not labelled broken', () => {
  assert.match(script, /status === 401 \|\| status === 403/);
  assert.match(script, /status === 429/);
  assert.match(script, /status >= 500/);
  assert.match(script, /return 'blocked'/);
  assert.match(script, /return 'transient'/);
});

test('YouTube videos use the oEmbed availability endpoint', () => {
  assert.match(script, /youtube\.com\/oembed/);
  assert.match(script, /watch\?v=/);
  assert.match(script, /YOUTUBE_KEYS/);
});

test('CCG internal URLs are excluded from the external monitor', () => {
  assert.match(script, /cheekycommodoregamer\.co\.uk/);
  assert.match(script, /SITE_HOSTS/);
  assert.match(script, /isInternalUrl/);
});

const workflow = fs.readFileSync('.github/workflows/external-link-health.yml', 'utf8');

function makeIssueReporter() {
  const marker = '          script: |\n';
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, 'the existing issue reporting step must remain');
  const body = workflow.slice(start + marker.length).split('\n')
    .map((line) => line.startsWith('            ') ? line.slice(12) : line).join('\n');
  return new Function('require', 'github', 'context', 'core', `return (async () => {\n${body}\n})();`);
}

function reporterFixture({ broken = 4, existing = [], issueError = null } = {}) {
  const warnings = [];
  const summaries = [];
  const updates = [];
  const notices = [];
  const requireMock = () => ({
    readFileSync(file) {
      return file.endsWith('.json')
        ? JSON.stringify({ summary: { confirmedBroken: broken } })
        : '# Link health report\\n\\nConfirmed broken: ' + broken;
    },
  });
  const github = {
    paginate: async () => existing,
    rest: {
      issues: {
        listForRepo() {},
        async create(data) {
          if (issueError) throw issueError;
          updates.push({ operation: 'create', data });
        },
        async update(data) {
          if (issueError) throw issueError;
          updates.push({ operation: 'update', data });
        },
      },
    },
  };
  const core = {
    summary: {
      addRaw(value) { summaries.push(value); return this; },
      async write() {},
    },
    warning(value) { warnings.push(value); },
    notice(value) { notices.push(value); },
  };
  return {
    run: () => makeIssueReporter()(requireMock, github, { repo: { owner: 'owner', repo: 'repo' } }, core),
    warnings, summaries, updates, notices,
  };
}

test('disabled GitHub Issues (410) preserves artifact, summary and broken-link warning without failing the audit', async () => {
  const fixture = reporterFixture({ issueError: Object.assign(new Error('Issues disabled'), { status: 410 }) });
  await assert.doesNotReject(fixture.run());
  assert.equal(fixture.summaries.length, 1);
  assert.match(fixture.summaries[0], /Confirmed broken: 4/);
  assert.ok(fixture.warnings.some((warning) => /disabled.*410/.test(warning)));
  assert.ok(fixture.warnings.some((warning) => /4 confirmed broken/.test(warning)));
  assert.match(workflow, /Upload detailed health artifact/);
});

test('unexpected GitHub Issues failures remain visible as failures', async () => {
  const fixture = reporterFixture({ issueError: Object.assign(new Error('Permission denied'), { status: 403 }) });
  await assert.rejects(fixture.run(), { status: 403 });
  assert.equal(fixture.summaries.length, 1);
});

test('enabled GitHub Issues still receives confirmed broken links and healthy closeouts', async () => {
  const broken = reporterFixture({ existing: [] });
  await broken.run();
  assert.equal(broken.updates[0]?.operation, 'create');
  assert.ok(broken.warnings.some((warning) => /4 confirmed broken/.test(warning)));

  const healthy = reporterFixture({
    broken: 0,
    existing: [{ number: 42, state: 'open', title: '[Automated] External link health' }],
  });
  await healthy.run();
  assert.equal(healthy.updates[0]?.operation, 'update');
  assert.equal(healthy.updates[0]?.data?.state, 'closed');
  assert.equal(healthy.updates[0]?.data?.issue_number, 42);
});

test('External Link Health artifact includes both reports from the hidden directory and fails if missing', () => {
  const uploadStep = workflow.split('      - name: Upload detailed health artifact\n')[1]
    ?.split('      - name: Update confirmed-broken-link issue\n')[0] || '';
  assert.match(uploadStep, /uses: actions\/upload-artifact@v4/);
  assert.match(uploadStep, /path: \|\n\s+\.health\/external-link-health\.json\n\s+\.health\/external-link-health\.md/);
  assert.match(uploadStep, /include-hidden-files: true/);
  assert.match(uploadStep, /if-no-files-found: error/);
  assert.doesNotMatch(uploadStep, /^\s+path: \.health\/\s*$/m);
  assert.match(workflow, /--json \.health\/external-link-health\.json/);
  assert.match(workflow, /--markdown \.health\/external-link-health\.md/);
});
