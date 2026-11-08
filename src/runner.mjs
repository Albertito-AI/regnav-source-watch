import { mkdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, basename, sep } from 'node:path';
import { compareSnapshots, renderMarkdown, InvalidInput } from './core.mjs';
import { repositoryRoot, snapshotFromGit } from './git.mjs';

export function runComparison({ repo = '.', base, head, manifest = '.regnav/manifest.json', mode = 'advisory' }) {
  if (!['advisory', 'strict'].includes(mode)) throw new InvalidInput('Mode must be advisory or strict.');
  const root = repositoryRoot(repo);
  const report = compareSnapshots(snapshotFromGit(root, base, manifest), snapshotFromGit(root, head, manifest));
  report.manifest_path = manifest;
  report.mode = mode;
  return { report, markdown: renderMarkdown(report), exitCode: mode === 'strict' && report.verdict === 'RECHECK_REQUIRED' ? 2 : 0 };
}

export function invalidResult(error) {
  const message = error instanceof InvalidInput ? error.message : 'The check could not complete. No unchanged result is available.';
  return {
    report: { schema_version: '1.0', tool_version: '0.1.0', verdict: 'INVALID', errors: [message] },
    markdown: `# RegNav Source Watch\n\n**INVALID**\n\n${message.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}\n\nNo unchanged result is available.\n`,
    exitCode: 1
  };
}

export function writeReports(directory, result) {
  const requested = resolve(directory);
  const isGitDirectory = path => path.split(sep).some(part => part.toLowerCase() === '.git');
  if (isGitDirectory(requested)) throw new InvalidInput('Reports cannot be written inside Git administration directories.');
  if (existsSync(requested) || !existsSync(dirname(requested))) throw new InvalidInput('Choose a new report directory under an existing parent; existing output is never overwritten.');
  // Resolve the existing parent before validating and writing. An innocently
  // named symlink or Windows junction must not redirect output into .git.
  const target = resolve(realpathSync(dirname(requested)), basename(requested));
  if (isGitDirectory(target)) throw new InvalidInput('Reports cannot be written inside Git administration directories.');
  mkdirSync(target, { recursive: false, mode: 0o700 });
  const reportPath = resolve(target, 'report.json');
  const summaryPath = resolve(target, 'summary.md');
  writeFileSync(reportPath, JSON.stringify(result.report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  writeFileSync(summaryPath, result.markdown, { flag: 'wx', mode: 0o600 });
  return { reportPath, summaryPath };
}

export function boundedSummary(markdown) {
  return markdown.length <= 60000 ? markdown : markdown.slice(0, 60000) + '\n\nSummary truncated. Consult report.json for all findings.\n';
}
