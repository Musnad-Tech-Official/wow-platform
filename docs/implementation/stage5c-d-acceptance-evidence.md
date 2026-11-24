# Stage 5C/D integrated remediation candidate

- AUD-009: exact submission ID + evidence references locked and rechecked on approval. Signed-query scope includes compact fingerprint; attestation additionally includes signed-result timestamp. Prior three-argument approval is denied; rejection / needs-info unchanged. Viewer/conflicted evidence keys redacted.
- AUD-031: published and proposed logo/cover comparison with private signed previews, independent reviewer, and fresh explicit attestation; candidate image metadata and business/requester path checked again server-side at decision. Rejection leaves the published profile unchanged. Viewer/conflicted image keys redacted.
- AUD-041: semantic foreground, warning and neutral tokens for identified complaint and evidence text; regression checks target WCAG 4.5:1.

Proposed SQL: 15/15 rollback-only tests passed. Includes stale submission/evidence, legacy bypass, reviewer scope, viewer redaction, media removal, rejection, missing/foreign images and anonymous denial. Actual Storage HTTP, successful non-null image publication with a real uploaded file, native-device accessibility and full role/session E2E remain Stage 6. This is not final acceptance; verify CI, migrations, post-application regression and integrated main before closure.
