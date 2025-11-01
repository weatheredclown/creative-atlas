# Creative Atlas — Product Spec v0.1

A playful, gamified personal knowledge system for organizing web comics, wikis, websites, games, GitHub repos, stories, conlangs, AI‑ and hand‑written novels, and more — with both creative canvases and tabular import/export.

📘 **Universe Briefs:** Looking for a deep dive on a flagship world? Start with the [Dustland Project Overview](docs/dustland-overview.md) to see how the retro RPG framework, persona mask system, and CRT aesthetic map into Creative Atlas artifacts.
📘 Lore reference: see [`docs/darv-language.md`](docs/darv-language.md) for the Darv language primer that anchors Tamenzut rituals, myths, and conlang work.

## Issue Drafts from Documentation

The `issue-drafts/` directory contains GitHub issue bodies generated from unchecked tasks in the documentation. Refresh the drafts after editing the docs:

```bash
node scripts/generateIssueDraftsFromDocs.js
```

Each markdown file can be pasted directly into a new GitHub issue or used with the GitHub CLI, for example:

```bash
gh issue create --title "<issue title>" --body-file issue-drafts/<file-name>.md
```

## Running the App Locally

The interactive prototype lives in the `code/` directory and is a client-side React application rendered through `index.tsx` and the HTML shell in `index.html`. Follow the steps below to get it running on your machine.

### 1. Install dependencies

1. Install Node.js 18 or newer.
2. From the repository root, move into the application directory and install the dependencies (Vite, React, TypeScript, etc.):

   ```bash
   cd code
   npm install
   ```

### 2. Configure environment variables

The frontend expects Firebase configuration in `code/.env.local`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

When the backend API is running (see below), expose its URL so CSV/Markdown import/export calls are routed through the server:

```
VITE_DATA_API_BASE_URL=http://localhost:4000
```

### 3. Start the backend API (optional but recommended)

The `server/` package exposes authenticated CRUD endpoints that wrap Firestore and handle bulk import/export work. Run it locally with:

```bash
cd server
npm install
npm run dev
```

The server expects Firebase Admin credentials via environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`). When these are set, the API automatically provisions Firestore reads/writes on behalf of the signed-in user.

Set `ALLOWED_ORIGINS` (comma-separated) so deployed environments return the proper CORS headers during browser preflight checks. For example:

```
ALLOWED_ORIGINS=https://creative-atlas.web.app,https://staging.creative-atlas.web.app
```

For App Engine deployments, mirror the same value in [`server/app.yaml`](server/app.yaml) so the runtime picks up the environment variable automatically.

Grant the App Engine runtime service account (by default `<project-id>@appspot.gserviceaccount.com`) the **Cloud Datastore User** and **Firebase Admin** roles so `firebase-admin` can verify ID tokens and reach Firestore. Missing permissions manifest as 5xx responses from the API; with the new error banner in the UI you will now see a warning immediately if the backend credentials need attention.

When GitHub Actions deploys `main`, it now reuses that App Engine configuration. Store a service-account JSON (granted App Engine Deployer permissions) in the `GCP_APP_ENGINE_SERVICE_ACCOUNT` repository secret so [the merge deployment workflow](.github/workflows/firebase-hosting-merge.yml) can authenticate and run `gcloud app deploy` with the `server/app.yaml` manifest.

### GitHub Integration (Optional)

To enable the "Publish to GitHub" feature, you'll need to create a GitHub OAuth application and add its credentials to the backend environment.

1.  **Create a GitHub OAuth App:**
    *   Go to your GitHub developer settings: [https://github.com/settings/developers](https://github.com/settings/developers)
    *   Click "New OAuth App".
    *   **Application name:** "Creative Atlas (local)" or similar.
    *   **Homepage URL:** The URL of your frontend application (e.g., `http://localhost:5173`).
    *   **Authorization callback URL:** The callback URL for your backend API. For local development, this should be `http://localhost:5173/api/github/oauth/callback`. *Note: The frontend Vite server will proxy this to the backend.*

2.  **Configure Environment Variables:**
    *   In the `server/` directory, copy the `.env.example` file to a new file named `.env`:
        ```bash
        cp server/.env.example server/.env
        ```
    *   Open `server/.env` and fill in the following values from your GitHub OAuth app:
        *   `GITHUB_CLIENT_ID`: The "Client ID" of your GitHub OAuth app.
        *   `GITHUB_CLIENT_SECRET`: The "Client Secret" of your GitHub OAuth app.
        *   `APP_BASE_URL`: The base URL of your frontend application (e.g., `http://localhost:5173`).

### 4. Start the development server

Use the Vite dev server to run the app with hot reloading:

```bash
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`) you can open in a browser.

### 5. Build & preview production assets

To generate an optimized static build and preview it locally:

```bash
npm run build
npm run preview
```

The build artifacts land in `code/dist`, and `npm run preview` serves them with the same Vite configuration used in production.

### 6. Quality and test tooling

Run the automated quality gates before opening a pull request:

```bash
npm run lint
npm test
npm run test:e2e
```

`npm test` executes the Vitest-powered unit and integration suite. `npm run test:e2e` runs the Playwright smoke tests; the first run
may prompt you to install the required browsers via `npx playwright install`.
