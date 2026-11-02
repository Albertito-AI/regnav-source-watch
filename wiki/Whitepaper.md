<!-- atlas-whitepaper:managed:v1 -->

# RegNav Source Watch: keeping the reasons for a claim alive

## The problem is not merely changing text

A research claim can remain beautifully written while its evidential basis changes. A policy is amended, a dataset is corrected or a qualifying source disappears. A conventional file diff shows altered bytes. The more useful question is which propositions now need somebody's attention, and why.

Source Watch's thesis is narrow and powerful: explicitly record the relationship between claims and saved sources, then compare both the records and their source bytes at exact Git revisions. This makes maintenance an evidential task rather than a vague instruction to keep documentation current. It does not decide whether the new source is true, legally authoritative or correctly interpreted.

This AI-assisted design whitepaper was prepared for Albert Tan Sin Hon on 2 November 2026. It distinguishes implemented observations from proposed development and societal aspirations. It does not record independent user evaluation or a new legal review.

## First principles: knowledge has dependencies

The basic object is a dependency graph. A claim links to a source through a stated relationship: supports, qualifies, contradicts or context. A pinpoint makes the asserted location inspectable. A review declaration records who is said to have considered it and when. These are authored records, not authenticated conclusions.

The first principle is temporal specificity. A comparison concerns two particular commits, not an unbounded assurance that nothing relevant has changed anywhere. The second is coverage honesty. Undeclared sources are invisible to the tool. A remote website can change without its saved copy changing, and the software makes no network request to discover that event.

The third is non-erasure. Comparing only the new graph would allow deletion of an inconvenient link to hide a source's earlier relevance. Source Watch therefore considers dependencies from both snapshots. Removing a relationship becomes an observation, not a way to make past reliance disappear.

## Fundamental logic and why it stays offline

The implementation reads source blobs and manifests from named Git objects. Uncommitted working-tree changes do not alter that comparison. Strict parsing rejects ambiguous JSON and unsupported paths; symlinks and submodules are outside the accepted source type. Published size and count limits bound the work. These decisions keep the result reproducible and reduce the gap between what was reviewed and what was actually read.

The verdicts form a small language. `UNCHANGED` means no tracked substantive difference or missing source was found. `RECHECK_REQUIRED` means a source, claim or relation changed, or a tracked source could not be observed. `INVALID` means the comparison cannot be made within its contract. Missing on both sides never becomes reassuring sameness.

A review-field edit is visible but cannot clear an underlying change. This matters because a text label is not an authenticated approval. In strict mode, relevant changes continue to fail the comparison. Advisory mode is often the better starting point for a team still designing its review process. Accepted changes can become a later baseline, but that does not retroactively prove the earlier interpretation correct.

## A concrete institutional workflow

Imagine a public-interest research team records that a fictional policy requires action within seven days. The saved policy changes to ten days. Source Watch identifies the linked claim and the before/after fingerprints. A reviewer must then decide whether the proposition should change, whether an exception applies and which version governs the question being studied.

The valuable handoff is a bounded queue with reasons. The automation notices a dependency change; a qualified person supplies interpretation; the repository preserves the decision. A future authenticated review layer could bind approval to an exact comparison, but it must retain the original observation and the scope of approval. A checkbox must not make history disappear.

## Public-interest aim

The immediate aim is more dependable maintenance of evidence-backed records. The larger hope is a culture in which institutions publish the reasons for their assertions and can respond visibly when those reasons change. This could support research groups, civil-society organisations and public-interest software teams that cannot afford a large proprietary compliance platform.

An offline, dependency-free core lowers some deployment and confidentiality barriers. Portable JSON and ordinary Git reduce dependence on one service. Apache-2.0 applies to this package; it does not relicense the separate RegNav project or the documents a user monitors. Rights and privacy remain properties of the underlying material.

The danger is false comfort. An unchanged badge can be mistaken for truth, a narrow manifest for complete research, or a declared reviewer for real accountability. Interfaces and documentation should keep the comparison scope prominent. The social objective is better reconsideration, not an automated stamp of correctness.

## Ideal wishlist, in dependency order

| Development direction | What it would add | What must remain visible |
| --- | --- | --- |
| Better first use | Manifest assistance and clearer actionable reports | Explicit coverage and missing baselines |
| Review receipts | Authenticated decisions tied to exact comparisons | Original findings, reviewer scope and unresolved dissent |
| Deliberate source refresh | Separately authorised retrieval with provenance | Retrieval failures, licences and local/remote version differences |
| Interchange adapters | Mappings from other evidence records | Lossy fields and format-version boundaries |
| Institutional operation | Access control, retention and dependable maintenance | Responsibility for interpretation and policy overrides |

Semantic change classification could eventually reduce noise, but only as an additional observation. Byte-level evidence should remain reproducible. A model's statement that an edit is immaterial cannot silently replace the source comparison. Likewise, retrieval should be an explicit component with its own authority, not a hidden expansion of the offline Action.

## Evaluation: attention is a scarce resource

The critical measurements are whether reviewers find relevant changes, understand their scope and finish necessary reconsideration with acceptable effort. Seed known changes into permitted corpora, include harmless formatting edits, removed links, missing files and unchanged but mistaken claims. Record missed dependencies, false alarms, abstentions, setup effort and reviewer handling time.

A useful failure condition is notification fatigue: if teams routinely ignore findings, adding more alerts is not progress. Another is systematic undercoverage, where a clean result depends on an incomplete manifest. Evaluation must inspect both the tool and the human process that selects evidence.

The best case is a modest layer of institutional memory: people can explain what they relied on, what changed and why they revised or retained a conclusion. That would improve collective reasoning more than a universal-looking score unsupported by traceable work.

## Inspected foundation

Baseline: [`722cdbc0f0a203a305d1ce6d157d01af8f79f547`](https://github.com/Albertito-AI/regnav-source-watch/tree/722cdbc0f0a203a305d1ce6d157d01af8f79f547). See the [README](https://github.com/Albertito-AI/regnav-source-watch/blob/722cdbc0f0a203a305d1ce6d157d01af8f79f547/README.md), [manifest contract](https://github.com/Albertito-AI/regnav-source-watch/blob/722cdbc0f0a203a305d1ce6d157d01af8f79f547/docs/manifest.md) and [limitations](https://github.com/Albertito-AI/regnav-source-watch/blob/722cdbc0f0a203a305d1ce6d157d01af8f79f547/docs/limitations.md). Release checks establish bounded implementation behaviour; Marketplace availability, independent use and measured benefit are separate claims. This paper changes no product behaviour or licence.
