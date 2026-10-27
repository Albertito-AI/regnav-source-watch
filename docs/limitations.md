# Interpreting a Source Watch report

## What the comparison establishes

The report describes the supplied manifest and local source snapshots at two
specified Git commits. It records source-file identity, changes in declared
relationships and the claims affected by those differences.

The tool reads both versions of the manifest and considers dependencies on both
sides. Removing an old evidence link or deleting a claim remains visible in the
comparison. Source metadata changes also remain visible even when the source
bytes are identical.

## What remains a research task

A reviewer must determine whether a source is authentic, relevant and current;
whether a quotation is accurate; whether a proposition is justified; and how
qualifications or contrary evidence affect the conclusion. Unchanged files can
contain mistaken statements, obsolete rules or incomplete source collections.

The program only observes sources listed in the manifest. It does not discover
other authorities or changes on a live website. A URL is descriptive metadata,
and a version label is a recorded assertion. Changing a remote source without
updating the saved repository file is outside this check.

## Review declarations and strict mode

Reviewer names, dates and notes are recorded assertions. The program cannot
authenticate the reviewer or establish that an adequate review occurred.

`strict` mode fails whenever the comparison reports a substantive change or
missing source. An edited review declaration does not authorise the program to
clear that finding. This release has no approval verifier or waiver mechanism.
Use advisory findings within a human review process unless this strict policy is
the behaviour you require.

The finding is relative to a particular base and head. After reviewed changes are
accepted, later comparisons may begin from that accepted commit. That is a new
comparison, and it does not retroactively certify the earlier decision.

## Provenance and trust

Full commit SHAs identify the Git objects compared. SHA-256 digests identify the
source bytes read from those objects. Neither provides identity verification,
trusted time, institutional endorsement or legal certification by itself.

The repository owner controls which manifest, workflow and release to use. The
Action cannot enforce a policy if a contributor can disable the workflow or
replace the chosen Action. Protect those controls according to the repository's
normal review and branch policies.

## Operational boundary

Git, Node.js 24 and the required commit objects must be available. Shallow history,
an absent manifest, an invalid commit or an unsupported file type can prevent the
comparison. An invalid comparison fails in both modes.

The source reader uses committed blobs, so workspace edits do not affect the
results. Symlinks and submodules are rejected. The published size and count limits
bound supported input; this tool is not a general sandbox for hostile runner
processes or a replacement for isolating untrusted workloads.

## Evaluation status

Release checks and reproducible examples test implemented behaviour. Independent
adoption, measured time savings and commercial demand require separate evidence.
No such benefit is implied by a successful automated test or a Marketplace listing.
