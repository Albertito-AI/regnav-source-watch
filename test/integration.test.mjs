import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, appendFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { runComparison, writeReports } from '../src/runner.mjs';
import { snapshotFromGit, repositoryRoot } from '../src/git.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'regnav-integration-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.hooksPath=', '-c', 'user.name=RegNav Test', '-c', 'user.email=fixture@example.invalid', '-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  cpSync(join(project, 'examples/basic'), repo, { recursive: true });
  git('init', '-b', 'main'); git('add', '.'); git('commit', '-m', 'Fictional baseline');
  const base = git('rev-parse', 'HEAD');
  const commit = () => { git('add', '-A'); git('commit', '-m', 'Fictional change'); return git('rev-parse', 'HEAD'); };
  return { repo, git, base, commit };
}
function cli(f, extra = [], head = f.base) {
  return spawnSync(process.execPath, [join(project, 'src/cli.mjs'), '--repo', f.repo, '--base', f.base, '--head', head, ...extra], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
}
function action(t, f, { name = 'pull_request', base = f.base, head = f.base, inputBase, inputHead, manifest, mode = 'advisory' } = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'regnav-action-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const event = name === 'push' ? { before: base, after: head } : { pull_request: { base: { sha: base }, head: { sha: head } } };
  const eventPath = join(temp, 'event.json');
  const outputPath = join(temp, 'outputs');
  const summaryPath = join(temp, 'summary');
  writeFileSync(eventPath, JSON.stringify(event));
  const env = { ...process.env, GITHUB_WORKSPACE: f.repo, RUNNER_TEMP: temp, GITHUB_OUTPUT: outputPath, GITHUB_STEP_SUMMARY: summaryPath, GITHUB_EVENT_NAME: name, GITHUB_EVENT_PATH: eventPath, INPUT_MODE: mode, INPUT_MANIFEST: manifest || '', 'INPUT_BASE-SHA': inputBase || '', 'INPUT_HEAD-SHA': inputHead || '' };
  const result = spawnSync(process.execPath, [join(project, 'src/index.mjs')], { env, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  return { ...result, output: existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '', summary: existsSync(summaryPath) ? readFileSync(summaryPath, 'utf8') : '' };
}

test('CLI reports unchanged committed sources and creates complete output pair', t => {
  const f = fixture(t); const out = join(f.repo, 'new-report');
  const result = cli(f, ['--mode', 'strict', '--output', out]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).verdict, 'UNCHANGED');
  assert.equal(JSON.parse(readFileSync(join(out, 'report.json'))).verdict, 'UNCHANGED');
  assert.match(readFileSync(join(out, 'summary.md'), 'utf8'), /UNCHANGED/);
});
test('strict and advisory modes preserve identical affected claims but differ in exit status', t => {
  const f = fixture(t); appendFileSync(join(f.repo, 'sources/fictional-policy.md'), '\nChanged fictional text.\n'); const head = f.commit();
  const strict = cli(f, ['--mode', 'strict'], head); const advisory = cli(f, [], head);
  assert.equal(strict.status, 2); assert.equal(advisory.status, 0);
  assert.deepEqual(JSON.parse(strict.stdout).affected_claims.map(c => c.id), ['claim-routine']);
  assert.deepEqual(JSON.parse(advisory.stdout).affected_claims, JSON.parse(strict.stdout).affected_claims);
});
test('a deleted tracked source is a review finding', t => {
  const f = fixture(t); rmSync(join(f.repo, 'sources/fictional-exception.md')); const head = f.commit();
  const result = runComparison({ repo: f.repo, base: f.base, head });
  assert.equal(result.report.verdict, 'RECHECK_REQUIRED'); assert.equal(result.report.affected_claims.length, 2);
});
test('missing manifest at one commit is invalid in advisory mode', t => {
  const f = fixture(t); rmSync(join(f.repo, '.regnav/manifest.json')); const head = f.commit();
  const result = cli(f, [], head); assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).verdict, 'INVALID');
});
test('truncated or zero revisions never produce unchanged', t => {
  const f = fixture(t);
  for (const head of [f.base.slice(0, 7), '0'.repeat(40), '--help']) {
    const result = cli(f, [], head); assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).verdict, 'INVALID');
  }
});
test('malformed JSON is invalid and its raw input never appears in errors', t => {
  const f = fixture(t); writeFileSync(join(f.repo, '.regnav/manifest.json'), '{"secret-value": SECRET_TRAINING_MARKER}'); const head = f.commit();
  const result = cli(f, [], head); assert.equal(result.status, 1); assert.doesNotMatch(result.stdout, /SECRET_TRAINING_MARKER/);
});
test('size checks reject a source before reading oversized bytes', t => {
  const f = fixture(t); writeFileSync(join(f.repo, 'sources/fictional-policy.md'), Buffer.alloc(16 * 1024 * 1024 + 1)); const head = f.commit();
  assert.throws(() => snapshotFromGit(repositoryRoot(f.repo), head), /size limit/);
});
test('Action derives PR revisions and writes actual report outputs', t => {
  const f = fixture(t); const result = action(t, f);
  assert.equal(result.status, 0, result.stderr); assert.match(result.output, /UNCHANGED/); assert.match(result.output, /report-path/); assert.match(result.summary, /UNCHANGED/);
});
test('Action rejects PR revision overrides and pull_request_target', t => {
  const f = fixture(t);
  for (const options of [{ inputHead: 'a'.repeat(40) }, { name: 'pull_request_target' }]) {
    const result = action(t, f, options); assert.equal(result.status, 1); assert.match(result.output, /INVALID/); assert.doesNotMatch(result.output, /UNCHANGED/);
  }
});
test('Action rejects initial push with zero before SHA', t => {
  const f = fixture(t); const result = action(t, f, { name: 'push', base: '0'.repeat(40) });
  assert.equal(result.status, 1); assert.match(result.output, /INVALID/);
});
test('manual Action requires explicit revisions, then compares supplied full commits', t => {
  const f = fixture(t);
  assert.equal(action(t, f, { name: 'workflow_dispatch' }).status, 1);
  const result = action(t, f, { name: 'workflow_dispatch', inputBase: f.base, inputHead: f.base });
  assert.equal(result.status, 0, result.stderr); assert.match(result.output, /UNCHANGED/);
});
test('Action reports strict changes with workflow failure and preserved JSON findings', t => {
  const f = fixture(t); appendFileSync(join(f.repo, 'sources/fictional-policy.md'), '\nAnother fictional rule.\n'); const head = f.commit();
  const result = action(t, f, { head, mode: 'strict' }); assert.equal(result.status, 2); assert.match(result.output, /RECHECK_REQUIRED/); assert.match(result.summary, /routine/);
});
test('CLI refuses existing output and preserves its content', t => {
  const f = fixture(t); const out = join(f.repo, 'existing'); mkdirSync(out); writeFileSync(join(out, 'report.json'), 'retained');
  assert.equal(cli(f, ['--output', out]).status, 1); assert.equal(readFileSync(join(out, 'report.json'), 'utf8'), 'retained');
});
test('report output cannot target Git administration directories', t => {
  const f = fixture(t); const result = runComparison({ repo: f.repo, base: f.base, head: f.base });
  assert.throws(() => writeReports(join(f.repo, '.git', 'report'), result), /administration/);
});
