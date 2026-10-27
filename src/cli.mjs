#!/usr/bin/env node
import { InvalidInput } from './core.mjs';
import { runComparison, invalidResult, writeReports } from './runner.mjs';

const HELP = `RegNav Source Watch 0.1.0\n\nUsage: node src/cli.mjs --base FULL_SHA --head FULL_SHA [options]\n\nOptions:\n  --repo DIRECTORY       Git working tree (default: .)\n  --manifest PATH        Manifest relative to repository root (default: .regnav/manifest.json)\n  --mode advisory|strict Advisory reports findings; strict exits 2 for review findings\n  --output DIRECTORY     Write report.json and summary.md to a NEW directory\n  --help                 Show this help\n\nBoth commits and the initial manifest must exist locally. No network or model calls.\nExit 0: comparison completed in advisory mode or no changes in strict mode.\nExit 2: review required in strict mode. Exit 1: invalid input or incomplete check.\n`;

function parseArgs(args) {
  const options = {};
  const keys = new Set(['base', 'head', 'repo', 'manifest', 'mode', 'output']);
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i];
    if (!name.startsWith('--') || !keys.has(name.slice(2)) || i + 1 >= args.length || Object.hasOwn(options, name.slice(2))) throw new InvalidInput('Invalid, repeated or incomplete command-line option. Use --help.');
    options[name.slice(2)] = args[i + 1];
  }
  if (!options.base || !options.head) throw new InvalidInput('Both --base and --head are required. Use full commit SHAs.');
  return options;
}

if (process.argv.length === 3 && process.argv[2] === '--help') {
  process.stdout.write(HELP);
} else {
  let result;
  try {
    const options = parseArgs(process.argv.slice(2));
    try { result = runComparison(options); } catch (error) { result = invalidResult(error); }
    if (options.output) writeReports(options.output, result);
  } catch (error) { result = invalidResult(error); }
  process.stdout.write(JSON.stringify(result.report, null, 2) + '\n');
  process.exitCode = result.exitCode;
}
