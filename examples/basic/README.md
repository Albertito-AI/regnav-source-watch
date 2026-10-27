# Fictional example

Copy the contents of this directory into a fresh test Git repository, preserving
the `.regnav/` and `sources/` paths. Commit the files before enabling a comparison
workflow. The root-level `npm run demo` command automates a temporary-repository
exercise using these fixtures.

All documents, claims, version labels and reviewer information are synthetic.
They are supplied solely to make the tool's behaviour reproducible.

The manifest contains two claims. `claim-routine` depends on both the routine
policy and the qualifying referral note. `claim-specialist` depends only on the
referral note. Changing the policy should therefore affect `claim-routine` while
leaving `claim-specialist` unaffected. Changing the referral note should affect
both claims.

The manifest records a fictional review for the routine claim. That declaration
does not suppress a later source-change finding. The specialist claim has no
review declaration; lack of a declaration alone is not a difference between two
identical snapshots.
