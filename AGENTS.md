# Maintaining RegNav Source Watch

Read README.md, docs/manifest.md and docs/limitations.md before changing behaviour.

- Keep runtime dependency-free and source processing offline unless a specific user-approved feature changes that contract.
- Preserve the distinction between observed file changes, declared reviews and substantive verification.
- Never turn missing, invalid, unavailable or untracked evidence into a claim of verified accuracy.
- Read exact Git commits. Preserve duplicate-key validation, resource bounds, literal paths and rejection of symlink/submodule content.
- A candidate edit to a review declaration must never clear an underlying source-change observation.
- Keep examples visibly fictional; publish no private research, client data or credentials.
- Run npm test and npm run demo. Inspect all hosted release-check jobs before tagging a release.
- Record the actual commit, environment and results. Marketplace availability is verified separately from a release or successful CI.
- Update CHANGELOG.md for user-visible behaviour changes and preserve the explicit licence boundary in NOTICE.
- Keep changes bounded and reviewable. Pin third-party Actions to verified full commits.
