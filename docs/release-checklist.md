# Release checklist

This checklist defines release work. A checklist item is complete only when the
release validation record identifies its observed result.

- Confirm the intended version in package, metadata, report and changelog.
- Run meaningful unit and integration checks on the final candidate.
- Run the fictional demo and inspect both verdicts and generated reports.
- Exercise the published Action from a separate workflow at the candidate commit.
- Check failure behaviour for invalid input and strict review findings.
- Review the final diff for private data, secrets and unsupported claims.
- Confirm documentation examples match the implemented interface.
- Replace placeholder dependency pins with verified full commit SHAs.
- Confirm licence scope and all linked support/privacy documents.
- Confirm a unique Marketplace name and valid Action metadata.
- Create the versioned release after final-candidate checks pass.
- Complete the Marketplace release flow and verify the actual listing page.
- Record the release commit, test-run links and listing URL in the project record.

An available repository, passing test or published Git tag alone does not establish
that the Marketplace listing is live. Record those milestones separately.
