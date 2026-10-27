# Contributing

Contributions are welcome. Start with a reproducible issue or discuss a proposed
change before introducing new dependencies, network access, schema changes or
approval semantics.

Use Node.js 24 and Git. Run:

```sh
npm test
npm run demo
```

Keep tests tied to observable behaviour. Useful cases include missing sources,
evidence-link removal, reordered records, malformed manifests, unsafe paths and
review metadata that changes alongside the source it refers to. Include a
regression case for a corrected defect and describe the user-visible effect.

Use synthetic fixtures. Real research examples require permission to publish and
reproducible source details. Preserve the distinction between observed file
changes, declared human review and substantive verification.

Pull requests should explain the problem, resulting behaviour and verification
performed. Keep changes bounded and update relevant documentation. Accepted
contributions are credited through the repository history and release notes.

Contributions to this package are submitted under its [Apache-2.0 licence](LICENSE).
Do not include material whose rights are incompatible with that licence. The
licence does not extend to other RegNav repositories or third-party sources.
