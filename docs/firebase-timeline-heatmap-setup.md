# Publishing timeline heatmap snapshots

The simulated history heatmap automatically merges the timelines already in a workspace with any Firestore snapshots that belong to the signed-in collaborator. This page outlines how to seed those snapshots so new Firebase projects behave the same way your production deployment does.

## 1. Keep the default security rule

The repository's recommended Firestore rule already grants each collaborator access to their own timeline documents:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
  }
}
```

No additional claims or Firebase console configuration is required. As long as each document in the `timelineHeatmap` collection includes an `ownerId` field with the collaborator's UID, the frontend can read it.

## 2. Publish snapshots per collaborator

Create documents under `timelineHeatmap/` that mirror the structure consumed by `buildTimelineArtifactsFromFirestore`:

```json
{
  "ownerId": "<collaborator uid>",
  "worldId": "world-dustland",
  "worldTitle": "Dustland",
  "timelines": [
    {
      "timelineId": "dustland-history",
      "timelineTitle": "Dustland History",
      "events": [
        { "id": "era-of-embers", "title": "Era of Embers", "date": "-1200" },
        { "id": "reawakening", "title": "The Reawakening", "date": "843" }
      ]
    }
  ]
}
```

Add one document per collaborator who should see the snapshot. If multiple collaborators share the same world, duplicate the document and change only the `ownerId` so each UID has a copy the rule will authorize.

## 3. Automate the pipeline when ready

For production deployments, publish the documents from a trusted pipeline (for example, a Cloud Function or an App Engine cron job) that already has the ability to read timeline artifacts and knows each collaborator's UID. The frontend does not require any new environment variables or manual admin steps—once the documents exist, it automatically loads them for the relevant users.

If you later centralize history curation in your backend, keep the same structure and continue writing an `ownerId` per collaborator. Doing so preserves the "just works" experience for anyone who signs in to a freshly provisioned Firebase project.
