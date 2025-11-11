# Analytics & Monitoring Runbook

This runbook documents how to operate the new Firebase Analytics instrumentation that ships with the Creative Atlas frontend.

## 1. Instrumentation overview

The frontend now boots Firebase Analytics whenever the app runs in a supported browser environment. Events are recorded with anonymized parameters so we can track feature health without storing user-generated content:

| Event | When it fires | Parameters |
| --- | --- | --- |
| `workspace_view_mode_change` | A creator switches the artifact workspace between table, graph, or kanban | `project_id`, `view_mode` |
| `workspace_detail_toggle` | The "Detail level" toggle reveals or hides advanced fields | `detail_level` |
| `workspace_create_artifact_clicked` | The hero panel "New artifact" button is pressed | `project_id`, `source` |
| `quick_fact_capture_started` | The hero panel quick-fact button launches the capture modal | `project_id`, `source` |
| `workspace_publish_clicked` | The publish CTA in the hero panel is activated | `project_id`, `source` |
| `workspace_error` | The workspace error toast appears (e.g., failed save or render) | `project_id`, `severity`, `message_length` |

Firebase Analytics automatically associates events with the active user ID (when available) and their selected tutorial language to help segment onboarding cohorts.

## 2. Console configuration

1. Open the [Firebase console](https://console.firebase.google.com/) and select the **creative-atlas** project.
2. Navigate to **Analytics → Dashboard** to confirm events are appearing. Each event listed above should appear within a few minutes of exercising the corresponding UI.
3. Create custom dimensions for `project_id`, `view_mode`, and `detail_level` so that dashboards and funnels can filter on these parameters. The schema should use the same parameter names emitted in the table above.

## 3. Alerting playbook

1. In **Analytics → Events**, select `workspace_error` and choose **Create custom alert**.
2. Configure the alert to trigger when `workspace_error` exceeds 5 occurrences within a 30-minute window. Target the on-call email list for workspace stability.
3. Repeat for `workspace_publish_clicked` with a threshold of fewer than 3 events per day to catch regressions in the publish flow.
4. Optionally add a dashboard chart comparing `workspace_detail_toggle` counts in detailed vs. simple modes to monitor adoption of advanced editing features.

## 4. Incident response

* **Spike in `workspace_error`:**
  1. Inspect the `project_id` dimension to see whether the failures are isolated.
  2. Reproduce with the affected project using the latest `main` build.
  3. File a bug with steps, including the approximate timestamp and screenshot of the analytics event trend.
* **Drop in publish events:**
  1. Review backend logs around the timeframe for deployment errors.
  2. Run the GitHub publish flow locally using the same artifact count as the median project to confirm functionality.
  3. Communicate status in the #creative-atlas Slack channel and escalate to the backend team if the issue persists.

## 5. Maintenance checklist

* Verify the analytics dashboards monthly to ensure events are still flowing after dependency upgrades.
* Update this runbook whenever new analytics events are introduced or the alert thresholds change.
* If Firebase Analytics is disabled for any reason, update `README.md` and remove the instrumentation to avoid silent failures.
