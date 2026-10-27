# Security policy

## Reporting a vulnerability

Please do not publish credentials, private documents or an exploitable issue in a
public report. Use the maintainer's public professional contact route at
[alberttansinhon.com](https://www.alberttansinhon.com/) and identify the subject as
**RegNav Source Watch security report**. Begin with the affected version and a
non-confidential description. Agree a suitable channel before sending sensitive
material. No response-time guarantee is offered.

## Supported release

Security fixes are developed for the latest `0.1.x` release. Pin the exact release
commit used by your workflow and review subsequent fixes before updating it.

## Execution boundary

- Run the Action in a GitHub-hosted job with `contents: read` and no additional
  secret inputs. Checkout should use `persist-credentials: false`.
- The Action reads two committed snapshots. It does not execute source documents
  or treat manifest text as shell commands.
- `pull_request_target` is rejected. Use `pull_request` with isolated runners for
  untrusted contributions. Avoid placing untrusted jobs on persistent self-hosted
  runners with access to sensitive resources.
- Pin the Action and checkout dependency to reviewed full commit SHAs. The Action
  requires Node.js 24 support in the runner.
- Protect the workflow, Action pin and intended manifest location through your
  repository's review controls. The Action cannot prevent someone with sufficient
  repository authority from changing or disabling those controls.
- Commit IDs are validated, file paths are restricted, and only regular blobs are
  supported. Symlinks, submodules and unsupported input fail the comparison.
- Input sizes and record counts are bounded. Reports escape user-supplied display
  text and do not render source URLs as active links.

## Reports and permissions

Reports contain claim text, source paths, fingerprints, evidence relationships and
recorded reviewer details. They omit full source-file contents. Job summaries are
subject to GitHub's access controls, and runner files remain subject to that
runner's lifecycle. Review any optional upload or subsequent publishing step before
sharing reports outside the repository.

The Action makes no direct API, model or telemetry requests. GitHub's workflow
infrastructure and other actions in a job operate under their own behaviour and
terms. See [PRIVACY.md](PRIVACY.md).

Implementation checks are recorded in the release validation record. They do not
constitute an independent security audit or a claim of production certification.
