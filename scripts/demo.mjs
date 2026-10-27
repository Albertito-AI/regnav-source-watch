import { mkdtempSync, cpSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = mkdtempSync(join(tmpdir(), 'regnav-demo-'));
const git = (...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.hooksPath=', '-c', 'user.name=RegNav fictional fixture', '-c', 'user.email=fixture@example.invalid', '-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
try {
  cpSync(join(project, 'examples/basic'), directory, { recursive: true });
  git('init', '-b', 'main');
  git('add', '.');
  git('commit', '-m', 'Record fictional baseline');
  const base = git('rev-parse', 'HEAD');
  function check(head, expected, expectedAffected) {
    const result = spawnSync(process.execPath, [join(project, 'src/cli.mjs'), '--repo', directory, '--base', base, '--head', head, '--mode', 'strict'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    if (result.error) throw result.error;
    const report = JSON.parse(result.stdout);
    const actual = report.affected_claims.map(claim => claim.id).sort();
    if (report.verdict !== expected || JSON.stringify(actual) !== JSON.stringify(expectedAffected) || result.status !== (expected === 'UNCHANGED' ? 0 : 2)) throw new Error('The demonstration did not produce the expected real result.');
    console.log(JSON.stringify({ verdict: report.verdict, affected_claims: actual, base_revision: report.base_revision, head_revision: report.head_revision }, null, 2));
  }
  console.log('Fictional example; actual CLI output from temporary Git commits.');
  check(base, 'UNCHANGED', []);
  appendFileSync(join(directory, 'sources/fictional-policy.md'), '\nFictional amendment: the review target is now five days.\n');
  git('add', '.');
  git('commit', '-m', 'Change one fictional source');
  check(git('rev-parse', 'HEAD'), 'RECHECK_REQUIRED', ['claim-routine']);
} finally { rmSync(directory, { recursive: true, force: true }); }
