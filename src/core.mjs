// Copyright 2026 Albert Tan Sin Hon. Licensed under Apache-2.0.
// Pure validation and comparison. This module performs no file or network I/O.

export const LIMITS = Object.freeze({
  manifestBytes: 1024 * 1024,
  sources: 100,
  claims: 500,
  evidencePerClaim: 100,
  sourceBytes: 16 * 1024 * 1024,
  snapshotBytes: 64 * 1024 * 1024,
});

export class InvalidInput extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidInput';
  }
}

const own = (value, key) => Object.hasOwn(value, key);
const fail = (message) => { throw new InvalidInput(message); };

/** Validate JSON syntax and reject duplicate keys, including escaped aliases. */
function readStrictJson(text) {
  let offset = 0;
  const space = () => { while (/\s/u.test(text[offset] ?? '') && offset < text.length) offset++; };
  const error = () => fail(`Manifest is not valid strict JSON at offset ${offset}.`);
  function string() {
    if (text[offset] !== '"') error();
    const start = offset++;
    while (offset < text.length) {
      const character = text[offset++];
      if (character === '"') {
        try { return JSON.parse(text.slice(start, offset)); } catch { error(); }
      }
      if (character === '\\') offset++;
    }
    error();
  }
  function value(depth) {
    if (depth > 32) fail('Manifest JSON exceeds the nesting limit.');
    space();
    if (text[offset] === '{') {
      offset++;
      space();
      const keys = new Set();
      if (text[offset] === '}') { offset++; return; }
      while (offset < text.length) {
        space();
        const key = string();
        if (keys.has(key)) fail('Manifest JSON contains a duplicate object key.');
        keys.add(key);
        space();
        if (text[offset++] !== ':') error();
        value(depth + 1);
        space();
        if (text[offset] === '}') { offset++; return; }
        if (text[offset++] !== ',') error();
      }
      error();
    }
    if (text[offset] === '[') {
      offset++;
      space();
      if (text[offset] === ']') { offset++; return; }
      while (offset < text.length) {
        value(depth + 1);
        space();
        if (text[offset] === ']') { offset++; return; }
        if (text[offset++] !== ',') error();
      }
      error();
    }
    if (text[offset] === '"') { string(); return; }
    const literal = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(text.slice(offset));
    if (!literal) error();
    offset += literal[0].length;
  }
  value(0);
  space();
  if (offset !== text.length) error();
  try { return JSON.parse(text); } catch { error(); }
}

function object(value, required, optional, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label} must be an object.`);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${label} contains an unsupported field.`);
  for (const key of required) if (!own(value, key)) fail(`${label} is missing ${key}.`);
}

function textField(value, label, maximum = 4096) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) {
    fail(`${label} must be a non-empty string of at most ${maximum} characters.`);
  }
  // Permit ordinary line breaks and tabs in prose, but not hidden terminal or
  // bidirectional controls or malformed Unicode. Rendered output escapes prose.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value) ||
      !value.isWellFormed()) fail(`${label} contains unsupported control characters or malformed Unicode.`);
  return value;
}

function identifier(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._-]{0,79}$/u.test(value)) {
    fail(`${label} must be an ASCII identifier of 1 to 80 characters.`);
  }
}

/** Return a repository-relative POSIX path or throw InvalidInput. */
export function validatePath(value) {
  textField(value, 'Source path', 1024);
  if (value !== value.trim() || /[\\:\u0000-\u001f\u007f]/u.test(value) ||
      value.startsWith('/') || value.startsWith('-') || value.includes('@{')) {
    fail('Source path must be a safe relative POSIX path without revision syntax.');
  }
  const segments = value.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || segment.toLowerCase() === '.git')) {
    fail('Source path contains an empty, dot, traversal or .git component.');
  }
  return value;
}

function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) fail('Review date must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('Review date must be a valid calendar date.');
}

function evidenceKey(link) { return JSON.stringify([link.source_id, link.relation, link.pinpoint]); }

function validateManifest(manifest) {
  object(manifest, ['schema_version', 'sources', 'claims'], [], 'Manifest');
  if (manifest.schema_version !== '1.0') fail('Unsupported manifest schema_version. Expected 1.0.');
  if (!Array.isArray(manifest.sources) || manifest.sources.length < 1 || manifest.sources.length > LIMITS.sources) {
    fail(`Manifest must contain between 1 and ${LIMITS.sources} sources.`);
  }
  if (!Array.isArray(manifest.claims) || manifest.claims.length < 1 || manifest.claims.length > LIMITS.claims) {
    fail(`Manifest must contain between 1 and ${LIMITS.claims} claims.`);
  }
  const ids = new Set();
  const sourceIds = new Set();
  const sourcePaths = new Set();
  for (const source of manifest.sources) {
    object(source, ['id', 'path'], ['title', 'version', 'url'], 'Source');
    identifier(source.id, 'Source id');
    if (ids.has(source.id)) fail('Manifest contains duplicate identifiers.');
    ids.add(source.id);
    sourceIds.add(source.id);
    validatePath(source.path);
    if (sourcePaths.has(source.path)) fail('Manifest contains duplicate source paths.');
    sourcePaths.add(source.path);
    if (own(source, 'title')) textField(source.title, 'Source title', 1024);
    if (own(source, 'version')) textField(source.version, 'Source version', 256);
    if (own(source, 'url')) {
      textField(source.url, 'Source URL', 2048);
      if (/\s/u.test(source.url)) fail('Source URL must not contain whitespace.');
      let url;
      try { url = new URL(source.url); } catch { fail('Source URL must be an absolute HTTP or HTTPS URL.'); }
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
        fail('Source URL must be HTTP or HTTPS and must not include credentials.');
      }
    }
  }
  for (const claim of manifest.claims) {
    object(claim, ['id', 'text', 'evidence'], ['review'], 'Claim');
    identifier(claim.id, 'Claim id');
    if (ids.has(claim.id)) fail('Manifest contains duplicate identifiers.');
    ids.add(claim.id);
    textField(claim.text, 'Claim text', 8192);
    if (!Array.isArray(claim.evidence) || claim.evidence.length < 1 || claim.evidence.length > LIMITS.evidencePerClaim) {
      fail(`Claim evidence must have between 1 and ${LIMITS.evidencePerClaim} links.`);
    }
    const links = new Set();
    for (const link of claim.evidence) {
      object(link, ['source_id', 'relation', 'pinpoint'], [], 'Evidence link');
      if (!sourceIds.has(link.source_id)) fail('Evidence link references an unknown source.');
      if (!['supports', 'qualifies', 'contradicts', 'context'].includes(link.relation)) fail('Evidence relation is unsupported.');
      textField(link.pinpoint, 'Evidence pinpoint', 2048);
      const key = evidenceKey(link);
      if (links.has(key)) fail('Claim contains duplicate evidence links.');
      links.add(key);
    }
    if (own(claim, 'review')) {
      object(claim.review, ['reviewer', 'date'], ['note'], 'Review declaration');
      textField(claim.review.reviewer, 'Reviewer', 256);
      calendarDate(claim.review.date);
      if (own(claim.review, 'note')) textField(claim.review.note, 'Review note', 4096);
    }
  }
  return manifest;
}

/** Parse and validate an explicitly versioned manifest. */
export function parseManifest(text) {
  if (typeof text !== 'string') fail('Manifest input must be a UTF-8 JSON string.');
  if (Buffer.byteLength(text, 'utf8') > LIMITS.manifestBytes) fail('Manifest exceeds the 1 MiB limit.');
  return validateManifest(readStrictJson(text));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const serialise = (value) => JSON.stringify(canonical(value));
const same = (left, right) => serialise(left) === serialise(right);
const orderedLinks = (links) => [...links].sort((left, right) => {
  // Exact code-unit order distinguishes canonically equivalent spellings. A
  // locale comparator can tie distinct pinpoints and make input order matter.
  const a = evidenceKey(left);
  const b = evidenceKey(right);
  return a < b ? -1 : a > b ? 1 : 0;
});

function snapshot(value) {
  object(value, ['revision', 'manifest', 'files'], [], 'Snapshot');
  if (typeof value.revision !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value.revision) || /^0+$/u.test(value.revision)) {
    fail('Snapshot revision must be a full, non-zero, lowercase Git object id.');
  }
  validateManifest(value.manifest);
  if (!(value.files instanceof Map) || value.files.size !== value.manifest.sources.length) fail('Snapshot files must cover exactly the manifest source identifiers.');
  for (const source of value.manifest.sources) {
    const file = value.files.get(source.id);
    object(file, ['status', 'sha256'], [], 'Snapshot file');
    if (file.status === 'observed') {
      if (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(file.sha256)) fail('Observed source requires a SHA-256 digest.');
    } else if (file.status === 'missing') {
      if (file.sha256 !== null) fail('A missing source must have a null digest.');
    } else fail('Snapshot file status is unsupported.');
  }
}

const sourceView = (source, file) => source ? { path: source.path, sha256: file.sha256, status: file.status, record: structuredClone(source) } : null;

/** Compare exact snapshots without mutating them or inferring substantive truth. */
export function compareSnapshots(base, head) {
  snapshot(base);
  snapshot(head);
  const oldSources = new Map(base.manifest.sources.map(source => [source.id, source]));
  const newSources = new Map(head.manifest.sources.map(source => [source.id, source]));
  const sourceChanges = [];
  const sourceChangesById = new Map();
  for (const id of [...new Set([...oldSources.keys(), ...newSources.keys()])].sort()) {
    const before = oldSources.get(id);
    const after = newSources.get(id);
    const oldFile = base.files.get(id);
    const newFile = head.files.get(id);
    const reasons = [];
    if (!before) reasons.push('SOURCE_ADDED');
    if (!after) reasons.push('SOURCE_REMOVED');
    if (before && after && !same(before, after)) reasons.push('SOURCE_RECORD_CHANGED');
    if (oldFile?.status === 'missing' || newFile?.status === 'missing') reasons.push('SOURCE_NOT_OBSERVED');
    if (oldFile?.status === 'observed' && newFile?.status === 'observed' && oldFile.sha256 !== newFile.sha256) reasons.push('SOURCE_BYTES_CHANGED');
    if (reasons.length) {
      const change = { id, reasons, before: sourceView(before, oldFile), after: sourceView(after, newFile) };
      sourceChanges.push(change);
      sourceChangesById.set(id, change);
    }
  }
  const oldClaims = new Map(base.manifest.claims.map(claim => [claim.id, claim]));
  const newClaims = new Map(head.manifest.claims.map(claim => [claim.id, claim]));
  const affectedClaims = [];
  const reviewChanges = [];
  for (const id of [...new Set([...oldClaims.keys(), ...newClaims.keys()])].sort()) {
    const before = oldClaims.get(id);
    const after = newClaims.get(id);
    const reasons = [];
    if (!before) reasons.push('CLAIM_ADDED');
    if (!after) reasons.push('CLAIM_REMOVED');
    if (before && after && before.text !== after.text) reasons.push('CLAIM_TEXT_CHANGED');
    if (before && after && !same(orderedLinks(before.evidence), orderedLinks(after.evidence))) reasons.push('EVIDENCE_LINKS_CHANGED');
    const dependencyIds = [...new Set([...(before?.evidence ?? []), ...(after?.evidence ?? [])].map(link => link.source_id))].sort();
    const changedSourceIds = dependencyIds.filter(sourceId => sourceChangesById.has(sourceId));
    if (changedSourceIds.length) reasons.push('LINKED_SOURCE_CHANGED');
    if (before && after && !same(before.review ?? null, after.review ?? null)) {
      reviewChanges.push({ id, before: structuredClone(before.review ?? null), after: structuredClone(after.review ?? null) });
    }
    if (reasons.length) {
      affectedClaims.push({
        id,
        text: (after ?? before).text,
        reasons,
        changed_source_ids: changedSourceIds,
        evidence: structuredClone(orderedLinks((after ?? before).evidence)),
        before: before ? structuredClone(before) : null,
        after: after ? structuredClone(after) : null,
        declared_review_before: structuredClone(before?.review ?? null),
        declared_review_after: structuredClone(after?.review ?? null),
      });
    }
  }
  return {
    schema_version: '1.0',
    tool_version: '0.1.0',
    base_revision: base.revision,
    head_revision: head.revision,
    verdict: sourceChanges.length || affectedClaims.length ? 'RECHECK_REQUIRED' : 'UNCHANGED',
    source_changes: sourceChanges,
    affected_claims: affectedClaims,
    review_record_changes: reviewChanges,
    counts: { sources: newSources.size, claims: newClaims.size, affected_claims: affectedClaims.length },
    limitations: [
      'Only explicitly listed source files and declared evidence links are covered.',
      'A byte or record change identifies a need for review; it does not establish that a proposition is false or that law has changed.',
      'Unchanged observations concern these two commits only; they do not establish current law, source authenticity, completeness or factual accuracy.',
      'Review metadata is a declaration and is not authenticated. A changed review record never clears a source or claim finding.',
      'The tool does not fetch URLs, read live websites, assess legal correctness or perform substantive human review.',
    ],
  };
}

/** Escape prose for Markdown tables and HTML-capable GitHub summaries. */
function escapeMarkdown(value) {
  return String(value).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    .replace(/[\\`*_{}\[\]()#+.!|~:\-]/gu, character => `&#${character.codePointAt(0)};`)
    .replace(/\r\n|\r|\n/gu, ' / ').replace(/\t/gu, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, '');
}

/** Render the report as bounded, inert prose. Full detail remains in JSON. */
export function renderMarkdown(report) {
  if (!report || typeof report !== 'object' || !['UNCHANGED', 'RECHECK_REQUIRED', 'INVALID'].includes(report.verdict)) fail('Report verdict is invalid.');
  const lines = ['# RegNav Source Watch', '', `**Result: ${report.verdict}**`, ''];
  if (report.verdict === 'INVALID') {
    lines.push('The comparison could not be completed. Resolve the input or execution error before relying on a result.', '');
    if (typeof report.error === 'string') lines.push(escapeMarkdown(report.error.slice(0, 2000)), '');
    return `${lines.join('\n')}\n`;
  }
  if (!Array.isArray(report.source_changes) || !Array.isArray(report.affected_claims) || !Array.isArray(report.review_record_changes)) fail('Report collections are invalid.');
  lines.push(`Base: \`${escapeMarkdown(report.base_revision)}\``, '', `Head: \`${escapeMarkdown(report.head_revision)}\``, '',
    `${report.source_changes.length} source finding(s); ${report.affected_claims.length} affected claim(s); ${report.review_record_changes.length} review declaration change(s).`, '');
  if (report.source_changes.length) {
    lines.push('## Source findings', '', '| Source | Before path | After path | Reasons |', '| --- | --- | --- | --- |');
    for (const entry of report.source_changes.slice(0, 30)) {
      lines.push(`| ${escapeMarkdown(entry.id)} | ${escapeMarkdown(entry.before?.path ?? '(absent)')} | ${escapeMarkdown(entry.after?.path ?? '(absent)')} | ${entry.reasons.map(escapeMarkdown).join(', ')} |`);
    }
    if (report.source_changes.length > 30) lines.push('', 'Additional source findings are retained in the JSON report.');
    lines.push('');
  }
  if (report.affected_claims.length) {
    lines.push('## Claims requiring attention', '', '| Claim | Statement | Reasons | Declared review at head |', '| --- | --- | --- | --- |');
    for (const entry of report.affected_claims.slice(0, 30)) {
      const review = entry.declared_review_after;
      const declared = review ? `${review.reviewer} (${review.date})` : 'No declaration';
      const statement = entry.text.length > 240 ? `${entry.text.slice(0, 240)}…` : entry.text;
      lines.push(`| ${escapeMarkdown(entry.id)} | ${escapeMarkdown(statement)} | ${entry.reasons.map(escapeMarkdown).join(', ')} | ${escapeMarkdown(declared)} |`);
    }
    if (report.affected_claims.length > 30) lines.push('', 'Additional affected claims and full statements are retained in the JSON report.');
    lines.push('');
  }
  if (report.review_record_changes.length) {
    lines.push('## Review declarations changed', '',
      report.review_record_changes.slice(0, 30).map(entry => escapeMarkdown(entry.id)).join(', '), '',
      'These are changes to recorded declarations. They do not authenticate reviewers or clear the findings above.', '');
  }
  lines.push('## Interpretation', '');
  for (const limitation of report.limitations ?? []) lines.push(`- ${escapeMarkdown(limitation)}`);
  return `${lines.join('\n')}\n`;
}
