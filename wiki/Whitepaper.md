<!-- atlas-whitepaper:managed:v1 -->

# RegNav Source Watch: keeping the reasons for a claim alive

## Abstract

RegNav Source Watch compares an authored evidence manifest and its saved sources at two exact Git commits. It reports changes to source bytes, source records, claims and evidence relationships, using dependencies from both snapshots. The intended contribution is a reproducible queue for reconsidering claims when their recorded basis changes. It neither retrieves current sources nor decides whether a claim is justified. This paper explains the comparison contract, distinguishes the implemented fictional demonstration from proposed institutional use, and defines research questions about coverage, alert burden and review effort. Implementation tests support bounded behaviour; independent usefulness remains to be evaluated.

## The problem is not merely changing text

A research claim can remain beautifully written while its evidential basis changes. A policy is amended, a dataset is corrected or a qualifying source disappears. A conventional file diff shows altered bytes. The more useful question is which propositions now need somebody's attention, and why.

Source Watch's thesis is narrow and powerful: explicitly record the relationship between claims and saved sources, then compare both the records and their source bytes at exact Git revisions. This makes maintenance an evidential task rather than a vague instruction to keep documentation current. It does not decide whether the new source is true, legally authoritative or correctly interpreted.

This AI-assisted design whitepaper was prepared for Albert Tan Sin Hon on 2 November 2026 and revised against the source identified below on 15 November 2026. It distinguishes implemented observations from proposed development and societal aspirations. It does not record independent user evaluation or a new legal review.

## First principles: knowledge has dependencies

The basic object is a dependency graph. A claim links to a source through a stated relationship: supports, qualifies, contradicts or context. A pinpoint makes the asserted location inspectable. A review declaration records who is said to have considered it and when. These are authored records, not authenticated conclusions.

The first principle is temporal specificity. A comparison concerns two particular commits, not an unbounded assurance that nothing relevant has changed anywhere. The second is coverage honesty. Undeclared sources are invisible to the tool. A remote website can change without its saved copy changing, and the software makes no network request to discover that event.

The third is non-erasure. Comparing only the new graph would allow deletion of an inconvenient link to hide a source's earlier relevance. Source Watch therefore considers dependencies from both snapshots. Removing a relationship becomes an observation, not a way to make past reliance disappear.

## Definitions that determine the result

A *manifest* is an authored list of sources, claims and links. A *snapshot* combines the manifest at a commit with the bytes of its listed source files. An *affected claim* is one with a recorded change or a dependency on a changed or unobserved source. A *review declaration* is supplied context about a purported review, not authenticated approval.

The [format contract](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/docs/manifest.md) requires valid manifests at both ends of the comparison. It bounds a manifest to 1 MiB, each source to 16 MiB and aggregate source content in one snapshot to 64 MiB. Source paths must resolve to supported regular Git blobs. The vocabulary of supporting, qualifying, contradictory and contextual links is entered by the record's author. The software does not test whether the relation or pinpoint is substantively correct.

## Fundamental logic and why it stays offline

The implementation reads source blobs and manifests from named Git objects. Uncommitted working-tree changes do not alter that comparison. Strict parsing rejects ambiguous JSON and unsupported paths; symlinks and submodules are outside the accepted source type. Published size and count limits bound the work. These decisions keep the result reproducible and reduce the gap between what was reviewed and what was actually read.

The verdicts form a small language. `UNCHANGED` means no tracked substantive difference or missing source was found. `RECHECK_REQUIRED` means a source, claim or relation changed, or a tracked source could not be observed. `INVALID` means the comparison cannot be made within its contract. Missing on both sides never becomes reassuring sameness.

A review-field edit is visible but cannot clear an underlying change. This matters because a text label is not an authenticated approval. In strict mode, relevant changes continue to fail the comparison. Advisory mode is often the better starting point for a team still designing its review process. Accepted changes can become a later baseline, but that does not retroactively prove the earlier interpretation correct.

## Worked comparison and deliberate counterexamples

The implemented [demonstration](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/scripts/demo.mjs) creates a temporary fictional Git repository. It first compares the baseline with itself and expects `UNCHANGED` with no affected claims. It then appends an amendment changing the policy's seven-day review target to five days, commits that change, and compares again. The expected result is `RECHECK_REQUIRED`, affecting `claim-routine` alone. The unchanged referral source leaves `claim-specialist` unaffected. The [captured run](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/docs/demo/observed-session.txt) records those outcomes and its historical environment.

This is a dependency observation, not a determination that the amendment is legally effective or that five days is the correct standard. Several counterexamples clarify the scope:

| Variation | What the contract implies | What a reviewer must avoid concluding |
| --- | --- | --- |
| Only the live website changes; committed source bytes and manifest stay fixed | No newly observed source-byte difference | That the website is current |
| A source is missing at both commits | Recheck required rather than reassuring equality | That equal absence means complete evidence |
| A contradictory link is removed while its source changes | Both snapshots retain the prior dependency for comparison | That deleting the link erases earlier reliance |
| Only a review name or date changes | The edit is reported separately; substantive verdict may remain unchanged | That the named person or adequacy of review was authenticated |
| Only a source's formatting changes | Byte changes can require recheck | That the proposition necessarily changed meaning |

### Reproduce and inspect the distinction

From an exact checkout of `19ee26bdd564cd37bf02c0503e62371be97187df`, with Git and Node.js 24 available:

```sh
node --version
git --version
npm test
npm run demo
```

The demo checks its two expected strict-mode CLI exits, 0 for unchanged and 2 for recheck, and itself exits successfully when those expectations are met. Temporary commit IDs vary. Preserve the returned comparison SHAs, affected claim IDs, command output and environment. These commands are instructions for a later verifier; they were not executed for this documentation revision.

| Paper claim | Evidence at the reviewed commit | Boundary |
| --- | --- | --- |
| Comparison includes dependencies from both sides | [Comparison implementation](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/src/core.mjs) and [core controls](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/test/core.test.mjs) | Only declared dependencies are covered |
| Source data come from named Git objects | [Git reader](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/src/git.mjs) and [integration controls](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/test/integration.test.mjs) | Objects must be locally available |
| Review declarations cannot clear substantive changes | [Core logic](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/src/core.mjs) and [review controls](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/test/review.test.mjs) | There is no approval or waiver verifier |
| Fictional change affects the linked claim | [Demo source](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/scripts/demo.mjs) and [recorded output](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/docs/demo/observed-session.txt) | A constructed example does not establish field effectiveness |

## A proposed institutional workflow

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

## Related methods and attribution

Git's [`git cat-file` manual](https://git-scm.com/docs/git-cat-file), Description and Options, documents reading repository-object contents and properties. That object model supplies the technical basis for comparing retained versions. The project-specific addition is the authored evidence graph and its bounded reconsideration report. Ordinary Git identity does not authenticate an institution or prove a source's proposition.

The W3C [PROV-DM Recommendation, 30 April 2013](https://www.w3.org/TR/2013/REC-prov-dm-20130430/), offers a broader vocabulary for entities, activities and responsible agents. It is related conceptual work, not this Action's schema. Source Watch's [manifest contract](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/docs/manifest.md) is also distinct from the separate RegNav Evidence Ledger format. Neither PROV interoperability nor direct acceptance of a ledger is implemented merely because these systems discuss provenance.

## Evaluation: attention is a scarce resource

The critical measurements are whether reviewers find relevant changes, understand their scope and finish necessary reconsideration with acceptable effort. Seed known changes into permitted corpora, include harmless formatting edits, removed links, missing files and unchanged but mistaken claims. Record missed dependencies, false alarms, abstentions, setup effort and reviewer handling time.

Before an empirical study, define whether the unit is a source change, affected claim or complete reviewer task. Independently label meaningful and harmless changes, freeze the comparison commits, and keep development fixtures separate from the evaluation set. Report correct alerts, missed dependencies, unnecessary alerts, invalid comparisons and incomplete tasks with explicit denominators. Measure manifest preparation and source-refresh work as well as review time. A comparison against ordinary diffs should use comparable tasks and control or disclose ordering and familiarity effects.

For teaching, ask learners to predict the five counterexamples above before inspecting the relevant test assertions. Require each answer to name the two commits, the covered source relationship and the unresolved interpretation. A second task asks them to design a missing-manifest control and explain why a failed comparison cannot be renamed unchanged. This evaluates reasoning about a bounded contract, not proficiency in substantive legal review.

A useful failure condition is notification fatigue: if teams routinely ignore findings, adding more alerts is not progress. Another is systematic undercoverage, where a clean result depends on an incomplete manifest. Evaluation must inspect both the tool and the human process that selects evidence.

The best case is a modest layer of institutional memory: people can explain what they relied on, what changed and why they revised or retained a conclusion. That would improve collective reasoning more than a universal-looking score unsupported by traceable work.

## Inspected foundation

Source reviewed for this revision: [`19ee26bdd564cd37bf02c0503e62371be97187df`](https://github.com/Albertito-AI/regnav-source-watch/tree/19ee26bdd564cd37bf02c0503e62371be97187df). Source and test assertions were inspected without executing the project. See the [README](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/README.md), [manifest contract](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/docs/manifest.md) and [limitations](https://github.com/Albertito-AI/regnav-source-watch/blob/19ee26bdd564cd37bf02c0503e62371be97187df/docs/limitations.md). Release checks establish bounded implementation behaviour; Marketplace availability, independent use and measured benefit are separate claims. This paper changes no product behaviour or licence.
