// Copyright 2026 Albert Tan Sin Hon. Licensed under Apache-2.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, validatePath, compareSnapshots, renderMarkdown, InvalidInput, LIMITS } from '../src/core.mjs';

function manifest() {
  return {
    schema_version: '1.0',
    sources: [{ id: 'source-1', path: 'sources/rule.md', title: 'Fictional training rule', version: 'v1' }],
    claims: [{ id: 'claim-1', text: 'The fictional rule specifies thirty days.', evidence: [{ source_id: 'source-1', relation: 'supports', pinpoint: 'paragraph 2' }], review: { reviewer: 'Fictional reviewer', date: '2026-10-27' } }],
  };
}
function snapshot(record = manifest(), revision = 'a'.repeat(40), digest = '1'.repeat(64)) {
  return { revision, manifest: record, files: new Map(record.sources.map(source => [source.id, { status: 'observed', sha256: digest }])) };
}
function pair() { return [snapshot(), snapshot(manifest(), 'b'.repeat(40))]; }
function parse(record) { return parseManifest(JSON.stringify(record)); }

test('valid manifest preserves explicit evidence and declared review', () => {
  const record = manifest();
  assert.deepEqual(parse(record), record);
});

test('strict JSON rejects malformed syntax, duplicate escaped keys and excessive nesting', () => {
  for (const value of ['', 'null', '{', '[1,]', '{"a":1,"\\u0061":2}', '{"schema_version":"1.0","schema_version":"1.0"}', '\ufeff{}', '{"x":NaN}', '{"x":Infinity}']) {
    assert.throws(() => parseManifest(value), InvalidInput);
  }
  assert.throws(() => parseManifest('['.repeat(34) + '0' + ']'.repeat(34)), /nesting/u);
  assert.throws(() => parseManifest(' '.repeat(LIMITS.manifestBytes + 1)), /1 MiB/u);
});

test('unknown fields, empty collections and duplicate identifiers are rejected', () => {
  for (const mutate of [
    record => { record.soruces = []; },
    record => { record.sources = []; },
    record => { record.claims = []; },
    record => { record.schema_version = '2'; },
    record => { record.claims[0].id = record.sources[0].id; },
    record => { record.sources.push({ id: 'source-2', path: 'sources/rule.md' }); },
    record => { record.sources[0].id = '-unsafe'; },
    record => { record.claims[0].evidence[0].source_id = 'unknown'; },
    record => { record.claims[0].evidence[0].relation = 'proves'; },
    record => { record.claims[0].evidence[0].pinpoint = ''; },
    record => { record.claims[0].evidence.push(structuredClone(record.claims[0].evidence[0])); },
    record => { record.claims[0].review.status = 'certified'; },
  ]) {
    const record = manifest(); mutate(record);
    assert.throws(() => parse(record), InvalidInput);
  }
});

test('source URLs are optional metadata and reject credentials and unsupported schemes', () => {
  for (const value of ['file:///etc/passwd', 'javascript:alert(1)', 'https://name:password@example.org', 'https://example.org/ a', 'relative/path']) {
    const record = manifest(); record.sources[0].url = value;
    assert.throws(() => parse(record), InvalidInput);
  }
  const record = manifest(); record.sources[0].url = 'https://example.org/source';
  assert.equal(parse(record).sources[0].url, record.sources[0].url);
});

test('calendar dates are validated without treating declarations as authentication', () => {
  for (const value of ['2025-02-29', '2026-04-31', '2026-00-10', '2026-10-00', '27/10/2026', '2026-10-27T00:00:00Z']) {
    const record = manifest(); record.claims[0].review.date = value;
    assert.throws(() => parse(record), InvalidInput);
  }
  const record = manifest(); record.claims[0].review.date = '2024-02-29';
  assert.equal(parse(record).claims[0].review.date, '2024-02-29');
});

test('paths reject traversal, revision syntax, control characters and git internals', () => {
  for (const value of ['../secret', 'a/../secret', '/absolute', 'C:/absolute', 'a\\file', 'a//b', './a', 'a/.', 'a/.GIT/config', '-option', 'a:other', 'a@{x}', ' a', 'a\nfile', 'a\u202efile']) {
    assert.throws(() => validatePath(value), InvalidInput, value);
  }
  assert.equal(validatePath('sources/fictional rule.md'), 'sources/fictional rule.md');
});

test('bounded string fields and valid Unicode prevent hidden terminal control input', () => {
  for (const value of [' ', 'x'.repeat(8193), 'hello\u0000world', 'hello\u001bworld', '\ud800']) {
    const record = manifest(); record.claims[0].text = value;
    assert.throws(() => parse(record), InvalidInput);
  }
});

test('exactly matching snapshots are unchanged regardless of declared reviewer', () => {
  const [base, head] = pair();
  const report = compareSnapshots(base, head);
  assert.equal(report.verdict, 'UNCHANGED');
  assert.deepEqual(report.source_changes, []);
  assert.deepEqual(report.affected_claims, []);
  assert.equal(report.base_revision, base.revision);
  assert.equal(report.head_revision, head.revision);
  assert.deepEqual(report.counts, { sources: 1, claims: 1, affected_claims: 0 });
});

test('changed source bytes identify precisely the linked claim', () => {
  const [base, head] = pair();
  head.files.set('source-1', { status: 'observed', sha256: '2'.repeat(64) });
  const report = compareSnapshots(base, head);
  assert.equal(report.verdict, 'RECHECK_REQUIRED');
  assert.deepEqual(report.source_changes[0].reasons, ['SOURCE_BYTES_CHANGED']);
  assert.deepEqual(report.affected_claims[0].changed_source_ids, ['source-1']);
  assert.equal(report.affected_claims[0].declared_review_before.reviewer, 'Fictional reviewer');
});

test('added and removed sources and claims remain visible', () => {
  const [base, head] = pair();
  head.manifest.sources[0].id = 'source-2';
  head.manifest.claims[0].id = 'claim-2';
  head.manifest.claims[0].evidence[0].source_id = 'source-2';
  head.files = new Map([['source-2', { status: 'observed', sha256: '1'.repeat(64) }]]);
  const report = compareSnapshots(base, head);
  assert.deepEqual(report.source_changes.map(entry => entry.id), ['source-1', 'source-2']);
  assert.deepEqual(report.affected_claims.map(entry => entry.id), ['claim-1', 'claim-2']);
  assert.ok(report.affected_claims[0].reasons.includes('CLAIM_REMOVED'));
  assert.ok(report.affected_claims[1].reasons.includes('CLAIM_ADDED'));
});

test('a changed source version or path is a finding even when bytes match', () => {
  for (const field of ['version', 'path', 'title', 'url']) {
    const [base, head] = pair();
    head.manifest.sources[0][field] = field === 'path' ? 'sources/new.md' : field === 'url' ? 'https://example.org' : 'changed';
    const report = compareSnapshots(base, head);
    assert.ok(report.source_changes[0].reasons.includes('SOURCE_RECORD_CHANGED'));
    assert.equal(report.affected_claims.length, 1);
  }
});

test('missing source bytes never receive unchanged result, including missing at both commits', () => {
  for (const sides of [['base'], ['head'], ['base', 'head']]) {
    const [base, head] = pair();
    if (sides.includes('base')) base.files.set('source-1', { status: 'missing', sha256: null });
    if (sides.includes('head')) head.files.set('source-1', { status: 'missing', sha256: null });
    const report = compareSnapshots(base, head);
    assert.equal(report.verdict, 'RECHECK_REQUIRED');
    assert.ok(report.source_changes[0].reasons.includes('SOURCE_NOT_OBSERVED'));
  }
});

test('review-only edits are recorded without a content-change verdict', () => {
  const [base, head] = pair();
  head.manifest.claims[0].review.date = '2026-10-28';
  const report = compareSnapshots(base, head);
  assert.equal(report.verdict, 'UNCHANGED');
  assert.equal(report.review_record_changes.length, 1);
});

test('adding a fresh review declaration cannot erase changed source findings', () => {
  const [base, head] = pair();
  head.files.set('source-1', { status: 'observed', sha256: '3'.repeat(64) });
  head.manifest.claims[0].review = { reviewer: 'A different declared reviewer', date: '2026-10-28' };
  const report = compareSnapshots(base, head);
  assert.equal(report.verdict, 'RECHECK_REQUIRED');
  assert.equal(report.review_record_changes.length, 1);
  assert.equal(report.affected_claims.length, 1);
});

test('changed text or pinpoints are substantive claim findings', () => {
  const [base, head] = pair();
  head.manifest.claims[0].text = 'A different proposition';
  head.manifest.claims[0].evidence[0].pinpoint = 'paragraph 3';
  const report = compareSnapshots(base, head);
  assert.deepEqual(report.affected_claims[0].reasons, ['CLAIM_TEXT_CHANGED', 'EVIDENCE_LINKS_CHANGED']);
});

test('removing a contradictory dependency cannot hide its source change', () => {
  const baseManifest = manifest();
  baseManifest.sources.push({ id: 'source-2', path: 'sources/exception.md' });
  baseManifest.claims[0].evidence.push({ source_id: 'source-2', relation: 'contradicts', pinpoint: 'exception 1' });
  const base = snapshot(baseManifest);
  const head = snapshot(manifest(), 'b'.repeat(40));
  const report = compareSnapshots(base, head);
  assert.ok(report.affected_claims[0].changed_source_ids.includes('source-2'));
  assert.ok(report.affected_claims[0].reasons.includes('EVIDENCE_LINKS_CHANGED'));
  assert.equal(report.affected_claims[0].before.evidence[1].relation, 'contradicts');
});

test('array and object-key ordering is not a substantive change and inputs are untouched', () => {
  const baseManifest = manifest();
  baseManifest.sources.push({ id: 'source-2', path: 'sources/exception.md' });
  baseManifest.claims[0].evidence.push({ source_id: 'source-2', relation: 'qualifies', pinpoint: 'exception 1' });
  baseManifest.claims.push({ id: 'claim-2', text: 'Second fictional proposition.', evidence: [structuredClone(baseManifest.claims[0].evidence[1])] });
  const base = snapshot(baseManifest);
  const head = snapshot(structuredClone(baseManifest), 'b'.repeat(40));
  head.manifest.sources.reverse(); head.manifest.claims.reverse(); head.manifest.claims[1].evidence.reverse();
  const before = structuredClone([base, head]);
  const report = compareSnapshots(base, head);
  assert.equal(report.verdict, 'UNCHANGED');
  assert.deepEqual([base, head], before);
});

test('malformed snapshot observations cannot be mistaken for unchanged', () => {
  for (const mutate of [
    value => { value.revision = 'main'; },
    value => { value.revision = '0'.repeat(40); },
    value => { value.files.clear(); },
    value => { value.files.set('source-1', { status: 'observed', sha256: null }); },
    value => { value.files.set('source-1', { status: 'missing', sha256: '1'.repeat(64) }); },
    value => { value.files.set('source-1', { status: 'unknown', sha256: null }); },
    value => { value.files.set('source-1', { status: 'observed', sha256: '1'.repeat(64), path: 'extra' }); },
  ]) {
    const [base, head] = pair(); mutate(head);
    assert.throws(() => compareSnapshots(base, head), InvalidInput);
  }
});

test('Markdown output renders untrusted text inertly and retains machine report detail', () => {
  const [base, head] = pair();
  head.manifest.claims[0].text = '<img src=x onerror=alert(1)> [open](https://example.org)\n::error::spoof | **bold**';
  const report = compareSnapshots(base, head);
  const markdown = renderMarkdown(report);
  assert.ok(!markdown.includes('<img'));
  assert.ok(!markdown.includes('[open]'));
  assert.ok(!markdown.includes('::error::'));
  assert.ok(!markdown.includes('**bold**'));
  assert.ok(markdown.includes('&lt;img'));
  assert.equal(report.affected_claims[0].text, head.manifest.claims[0].text);
  assert.ok(renderMarkdown({ verdict: 'INVALID', error: '<script> ::error::' }).includes('&lt;script&gt;'));
});

test('report is deterministic and detached from mutable input records', () => {
  const [base, head] = pair();
  head.manifest.claims[0].text = 'Changed proposition';
  const report = compareSnapshots(base, head);
  assert.deepEqual(report, compareSnapshots(base, head));
  head.manifest.claims[0].text = 'Changed again';
  assert.equal(report.affected_claims[0].text, 'Changed proposition');
  assert.equal(report.affected_claims[0].after.text, 'Changed proposition');
});
