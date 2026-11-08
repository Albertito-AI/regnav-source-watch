# Changelog

## Unreleased

- Resolve the existing report parent before writing, preventing symlinks or
  Windows junctions from redirecting output into `.git`. Ordinary parent links
  remain supported, with exclusive creation and no overwrite preserved.
- Preserve significant trailing whitespace in POSIX repository roots. Root
  discovery removes only Git's output terminator and works from nested folders.
- Add machine-readable software citation metadata using the existing author,
  ORCID, declared package version and separate-project licence scope.

## 0.1.0

Initial release scope:

- Compare explicit evidence manifests and source-file bytes at two Git commits.
- Identify affected claims using evidence links from both snapshots.
- Preserve declared supporting, qualifying, contradicting and contextual evidence.
- Report review-declaration edits separately from substantive changes.
- Provide advisory and strict modes with JSON and Markdown output.
- Run as a Node.js 24 GitHub Action or a local command-line tool without runtime
  dependencies, API keys or network calls in the implementation.
- Include fictional fixtures and a temporary-repository demonstration.

See the release validation record for checks actually performed. This release
does not authenticate reviews, retrieve websites or determine legal accuracy.
