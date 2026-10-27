# Privacy

RegNav Source Watch executes in the runner or local environment selected by its
user. This package has no hosted account service, analytics endpoint, telemetry,
model connection or outbound network function. It does not send document contents
to the maintainer.

The inputs are committed manifests and source files in the selected Git repository.
The outputs can include claim text, source paths, content fingerprints, evidence
relationships and declared reviewer details. The report omits complete source-file
contents. Use permitted material and avoid placing sensitive data in public
repositories or public workflow output.

When run as a GitHub Action, results are written to the workflow job summary and
to a directory in runner temporary storage. GitHub controls the hosting, access
and retention behaviour of its services. Other workflow steps, including checkout
or optional artifact uploads, operate independently of this package. Local CLI
outputs remain in the directory selected by the user.

Information voluntarily submitted through public issues is visible according to
GitHub's repository settings. Use synthetic examples in bug reports. For a private
enquiry, use the public professional contact route on
[the maintainer's website](https://www.alberttansinhon.com/). This notice does not
describe a separate paid or hosted service.
