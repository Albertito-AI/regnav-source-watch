import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { InvalidInput, parseManifest, validatePath, LIMITS } from './core.mjs';

const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const gitEnvironment = () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^GIT_(?:DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG|REPLACE_REF_BASE|SHALLOW_FILE|COMMON_DIR|NAMESPACE)/.test(key)) delete env[key];
  }
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_NO_REPLACE_OBJECTS: '1', GIT_LITERAL_PATHSPECS: '1', GIT_TERMINAL_PROMPT: '0' };
};

function git(repo, args, maxBuffer = 1024 * 1024) {
  try {
    return execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', repo, ...args], {
      encoding: null, maxBuffer, timeout: 15000, env: gitEnvironment(), windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch {
    throw new InvalidInput('Git could not read the requested committed data. Check the repository and fetch both complete commit histories (fetch-depth: 0).');
  }
}

export function validateRevision(value) {
  if (typeof value !== 'string' || !SHA.test(value) || /^0+$/.test(value)) throw new InvalidInput('Use a full, non-zero, lower-case Git commit SHA for both revisions.');
  return value;
}

export function repositoryRoot(directory) {
  let candidate;
  try {
    candidate = realpathSync(resolve(directory));
    if (!statSync(candidate).isDirectory()) throw new Error();
  } catch { throw new InvalidInput('The repository directory is unavailable.'); }
  const root = git(candidate, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
  if (!root) throw new InvalidInput('A checked-out Git working tree is required.');
  return realpathSync(root);
}

function entry(repo, revision, filePath) {
  validatePath(filePath);
  const output = git(repo, ['ls-tree', '-z', '--full-tree', revision, '--', filePath]);
  if (!output.length) return null;
  const records = output.toString('utf8').split('\0').filter(Boolean);
  if (records.length !== 1) throw new InvalidInput('A source path must identify exactly one regular committed file.');
  const match = /^(\d{6}) (\w+) ([a-f0-9]{40}|[a-f0-9]{64})\t([\s\S]+)$/.exec(records[0]);
  if (!match || match[4] !== filePath || !['100644', '100755'].includes(match[1]) || match[2] !== 'blob') {
    throw new InvalidInput('Only regular committed files are supported. Symlinks, directories and submodules cannot be sources or manifests.');
  }
  const sizeText = git(repo, ['cat-file', '-s', match[3]]).toString('ascii').trim();
  if (!/^\d+$/.test(sizeText)) throw new InvalidInput('Git returned an invalid object size.');
  const size = Number(sizeText);
  if (!Number.isSafeInteger(size)) throw new InvalidInput('Git object size is outside the supported range.');
  return { oid: match[3], size };
}

function readBlob(repo, record, limit) {
  if (record.size > limit) throw new InvalidInput('A committed file exceeds the documented size limit.');
  const bytes = git(repo, ['cat-file', 'blob', record.oid], limit + 1024);
  if (bytes.length !== record.size) throw new InvalidInput('Git returned an incomplete committed file.');
  return bytes;
}

export function snapshotFromGit(repo, revision, manifestPath = '.regnav/manifest.json') {
  validateRevision(revision);
  validatePath(manifestPath);
  if (git(repo, ['cat-file', '-t', revision]).toString('ascii').trim() !== 'commit') throw new InvalidInput('Both revisions must identify commit objects.');
  const manifestEntry = entry(repo, revision, manifestPath);
  if (!manifestEntry) throw new InvalidInput('The manifest must already be committed at both revisions. Establish and review the initial manifest before enabling this comparison.');
  const manifestBytes = readBlob(repo, manifestEntry, LIMITS.manifestBytes);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes); }
  catch { throw new InvalidInput('The manifest must be valid UTF-8.'); }
  const manifest = parseManifest(text);
  const files = new Map();
  let total = 0;
  for (const source of manifest.sources) {
    const record = entry(repo, revision, source.path);
    if (!record) {
      files.set(source.id, { sha256: null, status: 'missing' });
      continue;
    }
    total += record.size;
    if (total > LIMITS.snapshotBytes) throw new InvalidInput('Tracked sources exceed the aggregate snapshot size limit.');
    const bytes = readBlob(repo, record, LIMITS.sourceBytes);
    files.set(source.id, { sha256: createHash('sha256').update(bytes).digest('hex'), status: 'observed' });
  }
  return { revision, manifest, files };
}
