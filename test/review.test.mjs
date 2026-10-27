import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest, compareSnapshots, renderMarkdown } from '../src/core.mjs';
import { snapshotFromGit } from '../src/git.mjs';
import { runComparison, writeReports } from '../src/runner.mjs';

const baseRevision = '1'.repeat(40);
const headRevision = '2'.repeat(40);
const digestA = 'a'.repeat(64);
const digestB = 'b'.repeat(64);

function manifest() {
  return {
    schema_version: '1.0',
    sources: [{ id: 'source-a', path: 'sources/a.txt' }, { id: 'source-b', path: 'sources/b.txt' }],
    claims: [{
      id: 'claim-a',
      text: 'A fictional proposition awaiting substantive review.',
      evidence: [
        { source_id: 'source-a', relation: 'supports', pinpoint: 'section 1' },
        { source_id: 'source-b', relation: 'contradicts', pinpoint: 'section 2' },
      ],
      review: { reviewer: 'Fictional reviewer', date: '2026-01-01' },
    }],
  };
}

function snapshot(data = manifest(), revision = baseRevision) {
  return {
    revision,
    manifest: parseManifest(JSON.stringify(data)),
    files: new Map(data.sources.map((source) => [source.id, { status: 'observed', sha256: digestA }])),
  };
}

test('independent review: removing contrary evidence does not erase its changed-source impact', () => {
  const before = snapshot();
  const changed = manifest();
  changed.claims[0].evidence = changed.claims[0].evidence.filter((link) => link.source_id !== 'source-b');
  changed.sources = changed.sources.filter((source) => source.id !== 'source-b');
  const after = snapshot(changed, headRevision);
  const report = compareSnapshots(before, after);
  assert.equal(report.verdict, 'RECHECK_REQUIRED');
  assert.ok(report.affected_claims.some((claim) => claim.id === 'claim-a'));
  assert.ok(report.source_changes.some((source) => source.id === 'source-b'));
});

test('independent review: a new reviewer declaration cannot clear a changed source', () => {
  const before = snapshot();
  const changed = manifest();
  changed.claims[0].review = { reviewer: 'New fictional reviewer', date: '2026-10-27', note: 'Approved' };
  const after = snapshot(changed, headRevision);
  after.files.set('source-a', { status: 'observed', sha256: digestB });
  const report = compareSnapshots(before, after);
  assert.equal(report.verdict, 'RECHECK_REQUIRED');
  assert.ok(report.affected_claims.some((claim) => claim.id === 'claim-a'));
  assert.ok(report.review_record_changes.length > 0);
});

test('independent review: missing in both snapshots is never unchanged', () => {
  const before = snapshot();
  const after = snapshot(manifest(), headRevision);
  before.files.set('source-a', { status: 'missing', sha256: null });
  after.files.set('source-a', { status: 'missing', sha256: null });
  const report = compareSnapshots(before, after);
  assert.equal(report.verdict, 'RECHECK_REQUIRED');
  assert.ok(report.affected_claims.some((claim) => claim.id === 'claim-a'));
});

test('independent review: changed source path remains visible when bytes happen to match', () => {
  const before = snapshot();
  const changed = manifest();
  changed.sources[0].path = 'sources/replacement.txt';
  const after = snapshot(changed, headRevision);
  const report = compareSnapshots(before, after);
  assert.equal(report.verdict, 'RECHECK_REQUIRED');
  assert.ok(report.affected_claims.some((claim) => claim.id === 'claim-a'));
});

test('independent review: list reordering alone is stable and inputs are not mutated', () => {
  const before = snapshot();
  const changed = manifest();
  changed.sources.reverse();
  changed.claims[0].evidence.reverse();
  const after = snapshot(changed, headRevision);
  const beforeSaved = structuredClone(before);
  const afterSaved = structuredClone(after);
  const report = compareSnapshots(before, after);
  assert.equal(report.verdict, 'UNCHANGED');
  assert.deepEqual(before, beforeSaved);
  assert.deepEqual(after, afterSaved);
});

test('independent review: escaped duplicate JSON keys are rejected', () => {
  const text = JSON.stringify(manifest()).replace('"schema_version":"1.0"', '"schema_version":"1.0","schema_\\u0076ersion":"1.0"');
  assert.throws(() => parseManifest(text));
});

test('independent review: Unicode-equivalent pinpoints still have deterministic evidence ordering', () => {
  const data = manifest();
  data.claims[0].evidence = [
    { source_id: 'source-a', relation: 'supports', pinpoint: '\u00e9' },
    { source_id: 'source-a', relation: 'supports', pinpoint: 'e\u0301' },
  ];
  const before = snapshot(data);
  const reversed = structuredClone(data);
  reversed.claims[0].evidence.reverse();
  const after = snapshot(reversed, headRevision);
  assert.equal(compareSnapshots(before, after).verdict, 'UNCHANGED');
});

test('independent review: an absent file observation is invalid instead of silently ignored', () => {
  const before = snapshot();
  const after = snapshot(manifest(), headRevision);
  after.files.delete('source-b');
  assert.throws(() => compareSnapshots(before, after));
});

test('independent review: an observed file requires an actual SHA-256 digest', () => {
  const before = snapshot();
  const after = snapshot(manifest(), headRevision);
  after.files.set('source-a', { status: 'observed', sha256: null });
  assert.throws(() => compareSnapshots(before, after));
});

test('independent review: rendered findings do not emit source-supplied HTML or Markdown links', () => {
  const before = snapshot();
  const changed = manifest();
  changed.claims[0].text = '<img src=x onerror=alert(1)> [click](https://attacker.invalid)';
  const after = snapshot(changed, headRevision);
  const rendered = renderMarkdown(compareSnapshots(before, after));
  assert.ok(!rendered.includes('<img src=x'));
  assert.ok(!rendered.includes('[click](https://attacker.invalid)'));
});

function fixture(t, data = manifest()) {
  const dir = mkdtempSync(join(tmpdir(), 'regnav-review-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (args, input) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  git(['init']);
  git(['config', 'user.name', 'RegNav fictional fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['config', 'commit.gpgsign', 'false']);
  mkdirSync(join(dir, '.regnav'));
  mkdirSync(join(dir, 'sources'));
  writeFileSync(join(dir, '.regnav', 'manifest.json'), JSON.stringify(data));
  writeFileSync(join(dir, 'sources', 'a.txt'), 'Fictional source A.\n');
  writeFileSync(join(dir, 'sources', 'b.txt'), 'Fictional source B.\n');
  git(['add', '.']);
  git(['commit', '-m', 'Synthetic initial evidence']);
  return { dir, git, sha: git(['rev-parse', 'HEAD']) };
}

test('independent Git review: committed content wins over an uncommitted source overwrite', t => {
  const { dir, git, sha } = fixture(t);
  writeFileSync(join(dir, 'sources', 'a.txt'), 'Changed fictional source A.\n');
  git(['add', '.']);
  git(['commit', '-m', 'Synthetic source change']);
  const head = git(['rev-parse', 'HEAD']);
  writeFileSync(join(dir, 'sources', 'a.txt'), 'Fictional source A.\n');
  const result = runComparison({ repo: dir, base: sha, head });
  assert.equal(result.report.verdict, 'RECHECK_REQUIRED');
  assert.ok(result.report.affected_claims.some(claim => claim.id === 'claim-a'));
});

test('independent Git review: source paths containing glob characters remain literal', t => {
  const data = manifest();
  data.sources[0].path = 'sources/[ab].txt';
  const { dir, sha } = fixture(t, data);
  const snap = snapshotFromGit(dir, sha);
  assert.deepEqual(snap.files.get('source-a'), { status: 'missing', sha256: null });
  assert.equal(compareSnapshots(snap, snap).verdict, 'RECHECK_REQUIRED');
});

test('independent Git review: symlink-mode manifest is rejected without following it', t => {
  const { dir, git } = fixture(t);
  const oid = git(['hash-object', '-w', '--stdin'], 'sources/a.txt');
  git(['update-index', '--add', '--cacheinfo', `120000,${oid},.regnav/manifest.json`]);
  git(['commit', '-m', 'Synthetic unsupported symlink manifest']);
  assert.throws(() => snapshotFromGit(dir, git(['rev-parse', 'HEAD'])));
});

test('independent Git review: blob objects are not accepted as commit revisions', t => {
  const { dir, git } = fixture(t);
  const blob = git(['rev-parse', 'HEAD:sources/a.txt']);
  assert.throws(() => snapshotFromGit(dir, blob));
});

test('independent output review: existing report files survive attempted reuse', t => {
  const { dir, sha } = fixture(t);
  const output = join(dir, 'existing-report');
  mkdirSync(output);
  writeFileSync(join(output, 'report.json'), 'preserve this record');
  const result = runComparison({ repo: dir, base: sha, head: sha });
  assert.throws(() => writeReports(output, result));
  assert.equal(readFileSync(join(output, 'report.json'), 'utf8'), 'preserve this record');
});

test('independent Action review: summary failure never advertises an unchanged output', t => {
  const { dir, sha } = fixture(t);
  const runnerTemp = join(dir, 'runner-temp');
  mkdirSync(runnerTemp);
  const output = join(dir, 'github-output.txt');
  writeFileSync(output, '');
  const entrypoint = resolve(fileURLToPath(new URL('../src/index.mjs', import.meta.url)));
  const result = spawnSync(process.execPath, [entrypoint], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_WORKSPACE: dir,
      RUNNER_TEMP: runnerTemp,
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: runnerTemp,
      'INPUT_BASE-SHA': sha,
      'INPUT_HEAD-SHA': sha,
      INPUT_MANIFEST: '.regnav/manifest.json',
      INPUT_MODE: 'advisory',
    },
  });
  assert.equal(result.status, 1);
  assert.ok(!readFileSync(output, 'utf8').includes('\nUNCHANGED\n'));
});
