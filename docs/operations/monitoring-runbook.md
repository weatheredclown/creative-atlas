# Monitoring Runbook

Creative Atlas now emits structured telemetry for the highest-risk backend operations so compliance and operations teams can diagnose outages quickly. This runbook describes how to enable the logging pipeline, wire alerts, and respond to incidents.

## 1. Enable structured telemetry

1. **Set environment variables** (already defaulted locally):
   - `ENABLE_GCP_LOGGING=true` to activate the Cloud Logging client.
   - `OPERATIONS_LOG_NAME=creative-atlas-operations` (override per environment if you prefer isolated logs).
   - `REQUEST_WARNING_THRESHOLD_MS=4000` in production to surface slow requests without spamming development builds (defaults to 2000ms when unset).
2. **Deploy with updated configuration**: the values are mirrored in [`server/app.yaml`](../../server/app.yaml) so App Engine picks them up automatically. Confirm the runtime service account still has `Logs Writer` (included in the App Engine default role set).
3. **Verify locally (optional)**: when the logging client cannot initialize, the server falls back to console logging with the same structured payloads. You can test instrumentation via `curl` requests and observe `[telemetry]` lines in the server output.

## 2. Instrumented events

The telemetry client writes JSON payloads with the shape `{ event, status, severity, durationMs, metadata }`. Key events:

| Event | Description | Metadata highlights |
| --- | --- | --- |
| `http.request` | Automatic Express middleware logging request duration and status codes. | `method`, `path`, `statusCode`, `durationMs`, `route`, `requestId`. Latencies above `REQUEST_WARNING_THRESHOLD_MS` emit `WARNING` severity.
| `share.fetch` | Anonymous share link retrievals, including compliance expirations. | `shareId`, `projectId`, `ownerId`, `artifactCount`, `outcome`.
| `artifacts.import` | Bulk CSV imports. | `projectId`, `actorId`, `artifactId`, `importedCount`, `outcome` (`success`, `duplicate-artifact-id`, `compliance-violation`, etc.).
| `projects.export` | Project CSV/TSV/Markdown exports. | `projectId`, `actorId`, `format`, `delimiter`, `artifactCount`.
| `lexicon.export` | Conlang lexicon exports. | `actorId`, `format`, `lexemeCount`.
| `account.delete` | Account purges. | `actorId`, `userDocumentDeleted`, `outcome`.
| `compliance.violation` | Centralized log for every `ComplianceError`. | `violation`, `message`, `context` merged with request metadata.
| `server.start` | Captures boot events so alerting can detect restarts. | `port`, `environment`.

Use the metadata to pivot investigations without exposing PII—IDs are logged, but email addresses and other sensitive fields are redacted upstream.

## 3. Create log-based alerts

1. Open the **Google Cloud Console → Logging → Logs Explorer**.
2. Use this filter to capture critical backend errors and compliance violations:
   ```
   logName="projects/creative-atlas/logs/creative-atlas-operations"
   severity>="ERROR"
   ```
3. Click **Create alert**. Configure:
   - **Condition type**: Log-based.
   - **Aggregation**: `count` over a 5 minute window.
   - **Threshold**: >= 1 event (tune once baseline noise is understood).
   - **Notification channels**: on-call email, Slack webhook, or PagerDuty.
4. (Optional) Add a second alert for slow requests using:
   ```
   logName="projects/creative-atlas/logs/creative-atlas-operations"
   jsonPayload.event="http.request"
   jsonPayload.metadata.durationMs>4000
   ```
   Pair it with a higher threshold (e.g., >= 5 events in 10 minutes) to ignore isolated spikes.

## 4. Triage workflow

1. **Confirm alert details**: identify the affected event type (`event` field) and `status` (`error` vs. `success`).
2. **Drill into Logs Explorer** with additional filters, e.g.:
   ```
   jsonPayload.event="artifacts.import"
   jsonPayload.metadata.outcome="compliance-violation"
   ```
3. **Correlate via `requestId`** if the frontend supplied one, or via user/project IDs in `metadata`.
4. **Respond**:
   - For compliance violations, review the offending metadata and enforce policy (the logs already contain sanitized context).
   - For 5xx errors, tail live logs with `gcloud app logs tail --service default` to reproduce and capture stack traces.
   - For latency warnings, inspect Cloud Trace or Firestore metrics—many slow requests will surface as `WARNING` severities before failing.
5. **Document resolution** in your incident tracker and update thresholds or metadata if noisy events appear.

## 5. Maintenance

- Revisit thresholds quarterly; once traffic patterns change, `REQUEST_WARNING_THRESHOLD_MS` may need tuning.
- Extend instrumentation by calling `telemetry.startOperation(...)` in new routes—`telemetry.ts` handles Cloud Logging and console fallbacks automatically.
- Keep this runbook updated when you add new alerting channels or compliance policies.

With these steps, Segment D's monitoring requirement is partially complete: telemetry is live, alerts can be configured in a few clicks, and responders have a documented playbook.
