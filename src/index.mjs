import { readFileSync, appendFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { InvalidInput } from './core.mjs';
import { runComparison, invalidResult, writeReports, boundedSummary } from './runner.mjs';

const input = name => process.env[`INPUT_${name.toUpperCase()}`]?.trim() || '';
const escapeCommand = value => String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
let result;
try {
  const eventName = process.env.GITHUB_EVENT_NAME;
  if (eventName === 'pull_request_target') throw new InvalidInput('pull_request_target is deliberately unsupported. Use pull_request with a read-only token and a pinned released Action.');
  if (!process.env.GITHUB_WORKSPACE || !process.env.RUNNER_TEMP || !process.env.GITHUB_OUTPUT || !process.env.GITHUB_STEP_SUMMARY) throw new InvalidInput('Required GitHub Actions environment is unavailable. For local use, run src/cli.mjs.');
  let base = input('base-sha');
  let head = input('head-sha');
  if (['pull_request', 'push'].includes(eventName)) {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || statSync(eventPath).size > 5 * 1024 * 1024) throw new InvalidInput('The GitHub event file is missing or too large.');
    let event;
    try { event = JSON.parse(readFileSync(eventPath, 'utf8')); }
    catch { throw new InvalidInput('The GitHub event file is invalid.'); }
    const expectedBase = eventName === 'pull_request' ? event.pull_request?.base?.sha : event.before;
    const expectedHead = eventName === 'pull_request' ? event.pull_request?.head?.sha : event.after;
    if ((base && base !== expectedBase) || (head && head !== expectedHead)) throw new InvalidInput('Revision inputs must match the GitHub pull request or push event.');
    base = expectedBase;
    head = expectedHead;
  }
  result = runComparison({ repo: process.env.GITHUB_WORKSPACE, base, head, manifest: input('manifest') || '.regnav/manifest.json', mode: input('mode') || 'advisory' });
} catch (error) { result = invalidResult(error); }

try {
  const reportDirectory = join(process.env.RUNNER_TEMP || '', `regnav-source-watch-${randomUUID()}`);
  if (!process.env.RUNNER_TEMP || !process.env.GITHUB_OUTPUT || !process.env.GITHUB_STEP_SUMMARY) throw new InvalidInput('GitHub output paths are unavailable.');
  const paths = writeReports(reportDirectory, result);
  const outputs = {
    verdict: result.report.verdict,
    'affected-count': result.report.affected_claims?.length ?? 0,
    'report-path': paths.reportPath,
    'summary-path': paths.summaryPath
  };
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, boundedSummary(result.markdown), 'utf8');
  let outputText = '';
  for (const [name, value] of Object.entries(outputs).sort(([a], [b]) => Number(a === 'verdict') - Number(b === 'verdict'))) {
    const delimiter = `regnav_${randomUUID()}`;
    outputText += `${name}<<${delimiter}\n${value}\n${delimiter}\n`;
  }
  appendFileSync(process.env.GITHUB_OUTPUT, outputText, 'utf8');
} catch (error) { result = invalidResult(error); }

if (result.report.verdict === 'INVALID') process.stdout.write(`::error::${escapeCommand(result.report.errors[0])}\n`);
else if (result.report.verdict === 'RECHECK_REQUIRED') process.stdout.write(`::warning::RegNav identified ${result.report.affected_claims.length} affected claim(s). Inspect the job summary and JSON report.\n`);
else process.stdout.write('RegNav Source Watch: UNCHANGED for the explicitly tracked records and compared commits.\n');
process.exitCode = result.exitCode;
