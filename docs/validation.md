# Validation record

## Local candidate, 27 October 2026

Environment: Node.js v24.22.1, Git 2.51.1, Linux.

Commands actually run:

```sh
npm test
npm run demo
```

All 50 tests passed: 20 core cases, 14 integration cases and 16 cases written in
a separate implementation-review pass. This is internal software verification,
not an external audit or evidence of customer adoption.

The demo created actual temporary Git commits. Its first comparison returned
`UNCHANGED`; after an edit to the fictional policy, it returned
`RECHECK_REQUIRED` with exactly `claim-routine` affected.

Coverage includes strict duplicate-key parsing, missing sources and manifests,
unsupported file modes, content-size limits, contradictory dependency removal,
declared-review edits, exact committed data, literal Git paths, safe rendering,
output preservation, event-derived revisions, advisory/strict exit behaviour
and report-output failure.

Review found and corrected two defects before release: locale-based comparison
of Unicode evidence pinpoints, and the order in which successful Action outputs
were published relative to summary writing. Both have regression cases.

The local restricted child-process sandbox initially prevented Git subprocesses.
The same local tests were run successfully with approved unrestricted process
execution. No product code was changed to ignore process errors.

## Hosted release checks

The [Release checks workflow](https://github.com/Albertito-AI/regnav-source-watch/actions/workflows/ci.yml)
tests Linux, Windows and macOS on Node.js 24 and exercises the packaged Action
against a committed fictional baseline. Consult the run for the exact release
commit. A configured workflow is not a passing result; publication requires
observed success for the candidate.

The maintained project record identifies the observed run, release and Marketplace
listing separately. No independent user or paid-customer validation is claimed.
