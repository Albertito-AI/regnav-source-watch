# Support

For installation questions or reproducible bugs, use
[GitHub Issues](https://github.com/Albertito-AI/regnav-source-watch/issues).
Include the Action version or full commit, Node.js version, event type, mode,
expected result and actual result. Supply a minimal synthetic example that can be
shared publicly.

Common checks:

1. Both full commit SHAs exist in the local checkout.
2. The manifest exists at the configured path in both commits.
3. Source paths are relative to the repository root.
4. The JSON matches the [manifest reference](docs/manifest.md).
5. The runner supports Node.js 24 and has Git available.
6. Strict-mode findings are interpreted as described in [the README](README.md).

A missing source is a review finding. An invalid manifest or unavailable commit
is a failed comparison. Review-declaration edits do not remove an underlying
source-change finding.

Security-sensitive reports follow [SECURITY.md](SECURITY.md). Keep private source
documents, credentials, personal data and private repository paths out of public
issues. The project currently provides community support without a service-level
agreement.
