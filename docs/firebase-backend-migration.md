# Firebase Backend Migration Guide

This guide explains why Cloud Firestore is the best fit for Creative Atlas' first managed backend and walks through migrating the prototype's in-memory data to Firebase. Step 0 establishes authentication so every record can be associated with a signed-in user.

## Why Firestore over other Google Cloud databases?

| Service | Serverless? | Minimum cost at idle | Operational scope | Fit for Creative Atlas |
| --- | --- | --- | --- | --- |
| **Firestore (Native mode)** | Yes | $0 — stays in the free tier when under 50K reads / 20K writes / 20K deletes per day and <1 GiB storage | Document database with real-time listeners, granular security rules | ✅ Usage-based billing and a generous free tier match our <1 GiB, low-traffic requirement. SDKs integrate directly with web apps. |
| Realtime Database | Yes | $0 up to 1 GiB but single-region only | Simple JSON tree, real-time updates | ⚠️ Could work, but the hierarchical data model is harder to query for multi-tenant access patterns. |
| AlloyDB for PostgreSQL | No | ~$0.60+/hr for smallest instance plus storage | Managed Postgres cluster tuned for performance | ❌ Requires always-on compute; costs accumulate even with no traffic. |
| Cloud Spanner | No | ~$0.90+/hr plus storage | Globally distributed SQL | ❌ Enterprise-scale solution with steep minimums; overkill for our needs. |
| Bigtable | No | ~$0.65+/hr for minimal cluster | Wide-column database for massive throughput | ❌ Designed for high-volume analytics; expensive at low utilization. |

Firestore delivers the only serverless, pay-for-what-you-use option among these choices. It can scale with us later, supports rich queries, and pairs with Firebase Authentication for end-to-end user isolation.

## Step 0 — Set up Firebase Authentication

1. **Create or select a Firebase project.** Use the Firebase console and tie it to the existing `creative-atlas` Google Cloud project if available.
2. **Register the Creative Atlas web app.** Add a Web app in the Firebase project to obtain the config (`apiKey`, `authDomain`, etc.).
3. **Enable authentication providers.** Start with Email/Password in **Build → Authentication → Sign-in method**. Optionally enable OAuth providers once scopes are defined.
4. **Protect API keys in the frontend.** Store the Firebase config in `code/.env.local` as `VITE_FIREBASE_*` variables. Document the required variables in the app's README and load them where Firebase is initialized.
5. **Decide on session persistence.** For the React app, use `browserLocalPersistence` so sessions survive reloads, and fall back to `browserSessionPersistence` for shared devices.
6. **Create mock accounts for testing.** Seed a few users in the Firebase console (or through a CLI script) to validate authorization rules while the Firestore migration is underway.

With Authentication enabled, you can enforce per-user access control in Firestore security rules from the start.

## Step 1 — Provision Firestore in Native mode

1. In the Firebase console, open **Build → Firestore Database** and choose **Native mode**. This unlocks query features we need for filtering artifacts by tags, project, and owner.
2. Select a multi-region location (e.g., `nam5` for North America) to minimize future migrations.
3. Keep the default auto-scaling settings; the free tier already covers our prototype workloads.
4. Add initial security rules that scope collections by authenticated user ID, e.g. `allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId` (adjusted per collection).

## Step 2 — Model Creative Atlas data in Firestore

Firestore organizes data into collections of documents. A recommended structure:

```
users/{uid}
  profile: displayName, avatarUrl, xp, streak
projects/{uid}/{projectId}
  title, summary, status, tags[], createdAt, updatedAt
artifacts/{uid}/{artifactId}
  projectId, type, title, summary, status, tags[], data (map), relations[]
relations/{uid}/{relationId}
  fromArtifactId, toArtifactId, kind
quests/{uid}/{questId}
  completionState, progress, lastCompletedAt
achievements/{uid}/{achievementId}
  unlockedAt
```

Notes:
- **Per-user subcollections** keep access rules simple and ensure a user only sees their own universe.
- Artifact `data` can store type-specific payloads (conlang tables, wiki Markdown, task state) as nested maps or arrays.
- Relations can remain an array inside artifacts for simplicity, but a dedicated collection improves queryability for graph views.
- Shared template metadata (e.g., `TemplateCategory`, roadmap milestones) can stay in a public collection or bundled statically until real-time editing is required.

## Step 3 — Export the current in-memory data

1. Inspect the mock datasets in `code/App.tsx` and `code/types.ts` to confirm field names and enum values.
2. Write a temporary script (e.g., `code/scripts/export-mock-data.ts`) that imports the mock arrays (`initialProjects`, `initialArtifacts`, etc.) and serializes them to JSON matching the Firestore schema above. Include the `ownerId` for a seed user.
3. Run the script locally to produce JSON files (e.g., `seed-projects.json`, `seed-artifacts.json`). Keep these under `code/seeds/` for traceability.

## Step 4 — Import seed data into Firestore

1. Install the Firebase CLI (`npm install -g firebase-tools`) and log in with `firebase login`.
2. Use the CLI or the Firestore Data Import tool to upload the JSON exports:
   ```bash
   firebase firestore:delete --project creative-atlas --recursive projects/seedUserUid artifacts/seedUserUid
   firebase firestore:databases:documents:import seed-export/ --project creative-atlas
   ```
   Adjust the commands for your file structure. Alternatively, write a Node script using the Admin SDK to push documents programmatically.
3. Verify documents in the console and confirm security rules block access when `request.auth.uid` differs from the `ownerId`.

## Step 5 — Update the React app to read/write Firestore

1. **Initialize Firebase.** Create `code/services/firebase.ts` that reads the `VITE_FIREBASE_*` env vars, calls `initializeApp`, and exports configured instances of `getAuth` and `getFirestore`.
2. **Introduce data hooks/services.** Replace the mock state in `App.tsx` with hooks that subscribe to Firestore collections via `onSnapshot` or run batched `getDocs` queries. Keep Zustand or React Query in mind if additional caching is needed.
3. **Write converters.** Map Firestore documents to the TypeScript types in `code/types.ts`. Update the types to include `ownerId`, timestamps, and Firestore document IDs as needed.
4. **Gate UI by auth state.** Wrap the app in an auth provider that shows a login/signup flow (email/password to start) before rendering the workspace.
5. **Handle writes.** Replace functions that mutate local arrays with calls to `addDoc`, `setDoc`, `updateDoc`, and `runTransaction` where multi-step updates (e.g., XP increments) require atomicity.
6. **Add loading/error states.** Because Firestore calls are async, surface skeletons or fallback messages where the prototype previously had synchronous mock data.

## Step 6 — Remove mock data and finalize security

1. Delete the mock `initialProjects`, `initialArtifacts`, etc., once Firestore-backed hooks power the UI.
2. Strengthen Firestore security rules with schema validation (e.g., checking allowed artifact `type` values) and index definitions for frequent queries.
3. Set up Firebase Hosting previews or emulator suites for local testing (`firebase emulators:start`), ensuring CI can run integration tests without touching production data.

Following these steps migrates Creative Atlas from static demo content to a cost-efficient, multi-user Firebase backend without incurring idle charges.
