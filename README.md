# Creative Atlas — Product Spec v0.1

A playful, gamified personal knowledge system for organizing web comics, wikis, websites, games, GitHub repos, stories, conlangs, AI‑ and hand‑written novels, and more — with both creative canvases and tabular import/export.

📘 **Universe Briefs:** Looking for a deep dive on a flagship world? Start with the [Dustland Project Overview](docs/dustland-overview.md) to see how the retro RPG framework, persona mask system, and CRT aesthetic map into Creative Atlas artifacts.
📘 Lore reference: see [`docs/darv-language.md`](docs/darv-language.md) for the Darv language primer that anchors Tamenzut rituals, myths, and conlang work.

## Product Roadmap

### Guiding Principles — Creative Atlas Built for Tim
- One brain, many worlds: everything (stories, games, art, conlangs, repos, rulesets) lives inside one creative OS.
- Progress through play: quests, XP, and incremental additions turn lorebuilding into a game.
- Reveal complexity gradually: start with notebook simplicity and expand toward wiki → database → living archive → game UI.
- AI as a co-author (Gemini-first): it organizes, recommends links, and surfaces forgotten lore while Tim approves canon.
- Exports always matter: every world can produce wikis, game seeds, bibles, sheets, lexicons, and more.
- Atlas ≠ Notion — Atlas = Lore engine + authoring pipeline.

### Phase 1 — Core Lore OS (MVP)
The “Organize My Worlds Without Pain” release.
- [ ] Project selection across Sacred Truth, Dustland, Aputi, and more.
- [ ] Core artifact types at launch (characters, timelines, locations, rules/systems, terminology, scenes/chapters, game modules/quests).
- [ ] Rich text editor with Markdown and AI assist.
- [ ] Relationship graph linking characters ↔ events ↔ worlds.
- [ ] Import pipelines for Markdown and text dumps (chat, drafts).
- [ ] Export pipelines for chapter bible PDF/Markdown and lore JSON for game engines (Dustland ACK modules).
- [ ] World dashboards to add lore, visualize connections, and link crossover projects (Dustland NPC ←→ Sacred Truth vampire cameo).
- [ ] "Add one fact" button to reduce overwhelm.
- [ ] "Reveal depth" toggle for simple → detailed fields.
- [ ] "Narrative need heatmap" that flags characters not seen recently.
- [ ] Memory sync with Gemini-powered conversations gated by user approval.

### Phase 2 — Gamification & XP Loop
"Writing and making worlds gives XP. Lorebuilding is a game."
- [ ] XP system tied to adding artifacts, refining drafts, importing pages, and completing quests.
- [ ] Daily challenge board to surface fresh prompts.
- [ ] Level-up tree with creativity perks (Lore Weaver, Archivist, World Alchemist, Dungeon Master).
- [ ] Collectible inspiration cards covering archetypes, vibes, visual prompts, and genre modifiers.
- [ ] Player profile with creative streak tracking.
- [ ] Inspiration deck draw interface for mid-writing boosts.

### Phase 3 — World Simulation Layer
"World memory and logic enforcement."
- [ ] Time and continuity tracking across worlds.
- [ ] Lore validator to prevent contradictions against canon.
- [ ] Magic system structure builder (Tamenzut rules encoded).
- [ ] Physics/metaphysics constraint annotations.
- [ ] "World age" progression that evolves lore events.
- [ ] Factions and conflicts system for PIT, Dustland, and the 4X project.
- [ ] Simulated history heatmap and "What changed this century?" views.
- [ ] NPC memory map linking Dustland, Sacred Truth, Spatch, and beyond.

### Phase 4 — Narrative & Game Pipelines
Stories become game worlds, and game worlds fuel story arcs.
- [ ] Scene board for novels and narrative arcs.
- [ ] Quest board for game modules.
- [ ] Character arcs tooling with progression states.
- [ ] Procedural encounter generator blending Dustland and PIT lore.
- [ ] Story → module export supporting Dustland ACK, D&D cards, visual novel scenes, and script formats.
- [ ] Automated exports for character sheets, campaign packets, AI asset prompts, and lore codexes.

### Phase 5 — AI Companions & Muse Engine
Personalized Gemini-driven co-writers trained on Tim’s universes.
- [ ] Archivist agent that finds contradictions and suggests consistency fixes.
- [ ] Muse agent providing inspiration, aesthetics, and poetic voice.
- [ ] Game Designer agent that turns lore into encounters.
- [ ] Conlang Steward agent that grows Darv.
- [ ] Publisher Mode that turns the atlas into a website/wiki.
- [ ] NPC memory mode for canon-locked roleplay.
- [ ] Truth/Canon lock workflow where every addition requires approval.
- [ ] Lore distillation pipeline to produce mythic summaries from notes.

### Technical Stack (Tailored to Tim)
- Frontend: React + Vite + Tailwind.
- Database: Firestore or SQLite with local sync.
- Data layer: Zod schemas.
- Storage: Flat files plus JSON exports.
- Graph: d3-force or Cytoscape.
- Editor: TipTap or BlockNote.
- Infra: Cloud + local-first offline mode.
- AI: Modular (Gemini + local embedding store, following the existing integration patterns).

### Why This Works for Tim
| Tim’s trait | Atlas feature |
| --- | --- |
| Moves across many projects | Multi-world dashboards |
| Likes incremental structure | Reveal-depth UI + small quests |
| Worlds merge & echo | Cross-universe linking & export |
| Games + novels coexist | Game + narrative pipelines |
| Aesthetics matter | Inspiration card system |
| Conlangs & rules | System builders + lexicon manager |
| Iterative AI partner | Canon guardrails + muse agents |

### Final Vision
This isn’t a note app — it’s the Creative Engine, Lore Forge, and AI Codex Compiler. Sacred Truth vampires update Dustland myths, Tamenzut relics shape PIT fauna, Spatch emotional rules cross-pollinate Steamweave factions, STACI Starlight earns her meta show bible, and the Aputi timeline ripples into Edruel artifacts. Tim’s creative continuity becomes visible, lovable, and playable — a personal Alexandria and an evolving creative skill tree.

## Productionization Roadmap

### Persistent, Multi-User Data Layer
- [x] Launch a managed database-backed service (Firebase) and migrate project, artifact, and XP storage out of in-memory mocks.
- [x] Expose CRUD endpoints with pagination, validation, and schema enforcement so multiple users can manage separate worlds safely.
- [x] Move CSV/Markdown import and export flows to backend workers or endpoints to centralize validation and keep the UI responsive during large transfers.
- 📘 See [`docs/firebase-backend-migration.md`](docs/firebase-backend-migration.md) for the recommended Firebase + Firestore architecture and step-by-step migration plan (starting with authentication setup).

### Authentication, Authorization, and Profiles
- [x] Add sign-up and login flows with token-based authentication for the web client.
- [x] Associate every project and artifact with an owner and enforce row-level authorization rules.
- [x] Persist user-specific settings, XP totals, and achievements so progress follows accounts across devices.

### Collaboration & Offline-Resilient UX (do not implement yet)
- [ ] Decide on collaboration scope (real-time, turn-based, etc.) and add the necessary synchronization layer (websockets, CRDTs) for shared editing.
- [ ] Implement optimistic UI updates with conflict resolution to keep the workspace fluid during network delays.
- [ ] Add background draft syncing and local caching so editors remain usable when offline or during service interruptions.

### AI Platform Hardening (low priority)
- [ ] Proxy Gemini (and future model) calls through a secure backend to keep API keys out of the client.
- [ ] Capture the current exact-title recommendation heuristic used by templates and schedule richer ranking once higher-priority systems land.

### Robust Import/Export & Publishing
- [ ] Validate CSV/Markdown inputs on the server and return actionable schema errors to the client.
- [ ] Turn “Publish Site” into a backend-driven export that produces deployable static bundles hosted on durable storage/CDNs.

### Operational Readiness
- [x] Add linting, unit, integration, and end-to-end tests alongside the existing Vite build to create a regression safety net.
- [x] Stand up continuous integration that runs the full test suite on every pull request.

### Productization & Compliance (low priority)
- [ ] Layer in onboarding, documentation, accessibility, and localization improvements for first-time users.
- [ ] Establish policies for data retention, content moderation, and privacy covering generated and uploaded content.
- [ ] Provide support and education content (tutorials, FAQs) that make the product approachable for new creators.

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

When GitHub Actions deploys `main`, it now reuses that App Engine configuration. Store a service-account JSON (granted App Engine Deployer permissions) in the `GCP_APP_ENGINE_SERVICE_ACCOUNT` repository secret so [the merge deployment workflow](.github/workflows/firebase-hosting-merge.yml) can authenticate and run `gcloud app deploy` with the `server/app.yaml` manifest.

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

---

## 1) Vision & Design Tenets
**Vision:** A single “creative universe” that lets you seed ideas quickly, grow them into linked artifacts, and ship them — while feeling like you’re playing a game.

**Tenets**
- **Play First:** Progress feels like leveling up. Micro‑wins, streaks, quests.
- **Graph Native:** Everything is a node in a knowledge graph; relations are first‑class.
- **Progressive Depth:** Start simple. Reveal complexity when needed.
- **Open I/O:** Round‑trip data in clean CSV/JSON/Markdown. No lock‑in.
- **Multimodal:** Text, code, art, audio, and links coexist.
- **Creator‑Centric:** Fast capture (⌘K), offline‑friendly, one‑keystroke publish.

---

## 2) Primary Use Cases & Personas
**Tim the Solo Creator** (core): Seeds ideas, links Dustland (game) ↔ Spatch (comic) ↔ Tamenzut (novels) ↔ Darv (conlang), ships updates, exports tables.

**Collaborator/Contractor:** Receives a scoped “questline,” contributes assets, PR links, and notes.

**Reader/Playtester (optional):** Views read‑only builds, browses wikis, submits feedback.

---

## 3) Progressive Complexity Model (Layered UX)
- **Layer 1 — Seed:** Quick capture cards (idea, character, scene, mechanic, lexeme). Tags + light links.
- **Layer 2 — Grow:** Project dashboards, tables, Kanban, milestone tracker, basic graph view.
- **Layer 3 — Forge:** Rich editors (conlang lexicon, storyboard, world wiki), release pipelines, integrations.
- **Layer 4 — Showcase:** Publish static sites/wiki docs, export bundles, public gallery.

Reveal advanced controls as users “level up” or when data density crosses thresholds.

---

## 4) Core Domain Model (Graph)
**Node Types (selected):**
- **Project** (universe/container)
- **Artifact** (generic supertype with subtype): `WebComic | Wiki | Website | Game | Repo | Story | Novel | Conlang | Rulebook | CardGame | Character | Location | Faction | MagicSystem | LanguageLexicon | Scene | Chapter | Asset(Image/Audio/Video) | Prompt | DesignDoc | Task | Milestone | Release`
- **Person** (creator, collaborator)
- **Tag** (freeform taxonomy)

**Edge Types:**
- `CONTAINS(Project→Artifact)`, `RELATES_TO(Artifact↔Artifact)`
- `USES(Artifact→Repo|Asset|Prompt)`, `DERIVES_FROM(Artifact→Artifact)`
- `PUBLISHES_TO(Artifact→Website|Wiki)`, `PART_OF_SERIES(Story→Series)`
- `APPEARS_IN(Character→Scene|Chapter)`, `SET_IN(Scene→Location)`
- `SPEAKS(Character→Conlang)`, `DEFINES(Conlang→LanguageLexicon)`

**Status & Meta:** `status: idea|draft|in‑progress|alpha|beta|released`, `visibility: private|shared|public`, timestamps, owner, contributors.

---

## 5) Data Shapes (JSON Schemas)
> Minimal subset; full schemas grow as needed.

```json
// Project
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Project",
  "type": "object",
  "required": ["id", "title"],
  "properties": {
    "id": {"type": "string"},
    "title": {"type": "string"},
    "slug": {"type": "string"},
    "summary": {"type": "string"},
    "tags": {"type": "array", "items": {"type": "string"}},
    "status": {"type": "string", "enum": ["idea","active","paused","archived"]},
    "links": {"type": "array", "items": {"type": "string"}},
    "custom": {"type": "object"}
  }
}
```

```json
// Artifact (discriminator)
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Artifact",
  "type": "object",
  "required": ["id","type","title"],
  "properties": {
    "id": {"type": "string"},
    "type": {"type": "string"},
    "projectId": {"type": "string"},
    "title": {"type": "string"},
    "summary": {"type": "string"},
    "status": {"type": "string"},
    "tags": {"type": "array", "items": {"type": "string"}},
    "fields": {"type": "object"},
    "relations": {"type": "array", "items": {"type": "object", "properties": {"toId": {"type":"string"}, "kind": {"type":"string"}}}}
  }
}
```

```json
// ConlangLexeme (example subtype)
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ConlangLexeme",
  "type": "object",
  "required": ["id","lemma"],
  "properties": {
    "id": {"type": "string"},
    "lemma": {"type": "string"},
    "pos": {"type": "string"},
    "gloss": {"type": "string"},
    "etymology": {"type": "string"},
    "morphology": {"type": "object"},
    "examples": {"type": "array", "items": {"type": "string"}},
    "tags": {"type": "array", "items": {"type": "string"}}
  }
}
```

**ERD (textual):**
- `Project 1—* Artifact`
- `Artifact *—* Artifact (Relation with kind)`
- `Artifact 1—* Task`
- `Artifact 1—* Release`
- `Artifact 1—* Asset`
- `Conlang 1—* ConlangLexeme`

---

## 6) Views & Editors
**Home / Universe Map**
- Galaxy map of Projects (size = activity; color = status). Quick‑add; search; recent.

**Project Dashboard**
- Overview, Activity, Graph, Table, Kanban, Timeline, Publishing.

**Artifact Workbenches** (contextual toolsets):
- **Story/Novel:** scene cards, chapter tree, beat grid, POV tracker, world hooks.
- **Web Comic:** strip planner, panel board, character sheet links, asset slots, schedule.
- **Conlang:** lexicon table (inline CSV), phonology sketchpad, paradigms, usage examples.
- **Game (Dustland/Spatch):** module table, quest graph, asset vault, build links, PRs.
- **Wiki/Website:** page tree, link checker, publish target(s).
- **Repo:** branch heatmap, issue sync, release notes builder.

**Graph View**
- Force‑directed graph of all nodes; filter by type/tag; draw new edges.

**Table View**
- Spreadsheet‑like grids for any type; bulk edit; pivot by tag/status.

**Kanban / Timeline**
- Tasks/Milestones grouped by phase; calendar and Gantt overlays.

---

## 7) Gamification System
**Stats:** Creator Level, XP, Streak, Focus Score (distraction‑free sessions), Release Count.

**XP Sources:** capture idea (+5), link two artifacts (+2), close task (+8), publish (+25), write 500 words (+10), add 10 lexemes (+10).

**Quests:**
- **Daily Forge:** add one seed + one link.
- **Lore Drop:** document a character/location.
- **Patch Day:** merge one repo PR and annotate the change.

**Achievements (examples):**
- *Steamweave Scholar:* 10 linked artifacts in Steamweave arc.
- *Darv Polyglot:* 200 lexemes + 10 example sentences.
- *Dustland Cartographer:* ship a playable module.

**Seasonal Tracks (optional):** thematic event (e.g., “Smog & Gears Month”).

---

## 8) Import / Export (Round‑Trip)
**CSV/TSV:** Any table view exportable/importable. Example columns:
- `artifacts.csv`: `id,type,projectId,title,summary,status,tags,links`
- `relations.csv`: `fromId,kind,toId`
- `lexicon.csv`: `id,lemma,pos,gloss,etymology,tags`
- `tasks.csv`: `id,artifactId,title,state,assignee,due,labels`

**Markdown Bundles:**
- `/ProjectName/README.md` (overview)
- `/Artifacts/<Type>/<Slug>.md` with YAML front‑matter
- `/Assets/…` mirrored; relation map as `relations.json`

**Integrations (Adapters):**
- **GitHub:** import repos, issues, PRs, releases; link commits → artifacts; publish release notes.
- **Local Folders:** watch a directory; treat `.md`/`.json` as source; two‑way sync.
- **Google Docs/Drive (optional):** one‑way import of docs into `Artifacts`.
- **Static Site Export:** push to GitHub Pages/Netlify (Wikis & Catalogs).

---

## 9) Integrations & Automations
- **GitHub GraphQL:** repo metadata, issues/PRs, releases, actions badges.
- **AI Providers (abstracted):** prompt templates for: synopsis, beat outline, lexeme suggestions, release notes; provider keys stay pluggable with Gemini as the default (Vertex, others optional via existing adapters).
- **Build Hooks:** webhooks/CLI to trigger Dustland/Spatch builds and capture artifacts.

**Automation Rules (no‑code):**
- “When a chapter hits *ready*, generate release notes draft.”
- “When repo has a release, create a *Release* artifact and link to Storyboard.”

---

## 10) API Surface (GraphQL‑first)
**Types (subset):** `Project, Artifact, Relation, Task, Release, Asset, Tag, Person`

**Sample Queries/Mutations**
```graphql
query ProjectUniverse { projects { id title status tags } }

mutation AddArtifact($input: ArtifactInput!) { upsertArtifact(input: $input) { id type title } }

query Graph($projectId: ID!) {
  artifacts(projectId: $projectId) { id type title }
  relations(projectId: $projectId) { fromId kind toId }
}
```

**CLI Examples**
```bash
creative-atlas import csv artifacts.csv
creative-atlas export markdown ./out
creative-atlas publish static --project tamenzut --target gh-pages
```

---

## 11) Architecture
**Client:** Next.js (React) + Tailwind + Zustand (state) + React Flow (graph) + TanStack Table (grids) + TipTap (rich text) + Monaco (code).

**Server:** Node/TypeScript (Fastify) + GraphQL Yoga/Apollo. Background jobs via BullMQ (Redis).

**Data:** PostgreSQL (core tables), S3‑compatible storage (assets), Meilisearch (full‑text). Optional pgvector for semantic search. Graph modeled via `relations` table.

**Auth:** OAuth (GitHub/Google), access tokens (JWT), optional local accounts.

**Sync & Offline (v2):** local IndexedDB cache; CRDT (Yjs) for docs; background sync.

**Extensibility:** Plugin system with hooks (UI widgets, data adapters, automations). Manifest‑based: `conlang.lexicon` editor, `webcomic.panel-board`, `ai.prompt-wizard`.

---

## 12) Security & Privacy
- Encrypted at rest (DB + assets), HTTPS in transit.
- Project‑scoped roles: Owner, Editor, Commenter, Viewer.
- Local‑first modes keep private projects offline (v2 option).
- Export always available; delete truly deletes.

---

## 13) Templates (Tim‑Optimized)
- **Tamenzut Series:** `MagicSystem`, `Artifact: Rulebook`, `City`, `Faction`, `Edruel Ruins`, `Thread‑Weaving Log`, `Canon Tracker`.
- **Steamweave/Anya (coal‑punk):** `Clan`, `Workshop`, `Scene`, `Villain (Red‑Eyes)`, `Love Triangle Map`, `Release Notes`.
- **Dustland (RPG):** `Module`, `Quest`, `Persona Mask`, `NPC`, `Item`, `Tileset`, `Build`.
- **Spatch (Sport Comic):** `Team`, `Mentor`, `Rule Variant`, `Match`, `Panel Board`.
- **Darv (Conlang):** `Lexicon`, `Phonology`, `Paradigm`, `Proverb`, `Myth`.
- **Sacred Truth (Vampires):** `Episode`, `Case File`, `Monster Codex`, `Cathedral Asset`.

---

## 14) AI Copilots (Opt‑In)
- **Lore Weaver:** expands summaries, proposes links, conflict matrices.
- **Conlang Smith:** lexeme batches, paradigm tables, example sentences.
- **Story Doctor:** beat diagnostics, tension graphs, comp titles.
- **Release Bard:** changelogs → narrative release notes; trailer scripts.

**Prompt Slots (editable):**
- `synth_outline(projectId, artifactId, tone, constraints)`
- `lexeme_seed(conlangId, phonotactics, needed_pos)`
- `patch_notes(repo, tag_range, audience)`

---

## 15) Milestones & Roadmap (12–16 weeks)
**M1 — MVP (Weeks 1–4)**
- Core graph model, Projects/Artifacts/Relations
- Seed capture, Table view, basic Graph view
- CSV import/export (artifacts, relations)
- GitHub read‑only import (repos/issues/releases)

**M2 — Editors & Gamification (Weeks 5–8)**
- Conlang table editor; Storyboard; Kanban
- XP/Streaks/Quests + Achievements
- Markdown bundle export

**M3 — Publishing & Integrations (Weeks 9–12)**
- Static site exporter (Wikis/Docs)
- Release notes generator
- Search (Meilisearch), advanced filters

**M4 — Polish & Extensibility (Weeks 13–16)**
- Plugin API + 3 sample plugins (conlang, webcomic, ai prompts)
- Theming, keyboard palette, offline cache (light)

---

## 16) Success Metrics (local & qualitative)
- Time‑to‑first‑seed (<30s), daily streak length, tasks closed/week
- Linked‑artifact ratio (>0.6), export frequency, publish frequency
- Subjective: “feels like play” score (creator survey)

---

## 17) Risks & Mitigations
- **Scope Creep:** Use Layer model; ship per milestone.
- **Lock‑In Fear:** Invest early in clean import/export.
- **Perf on Big Graphs:** Server pagination, client virtualization, Meilisearch facets.
- **AI Provider Drift:** Abstract provider interface; prompt versioning.

---

## 18) Example Exports (snippets)
**Markdown (Story/Scene)**
```md
---
id: scn_steam_001
title: "Shroud and Gears"
project: steamweave
links: [chp1, red_eyes, city_foundry]
---
Smog rolled like a living thing…
```

**CSV (Lexicon)**
```csv
id,lemma,pos,gloss,etymology,tags
lx1,brubber,adj,strange;unusual,,core;darv
lx2,banushkadaum,n,ship (sea-building),,darv;mythic
```

---

## 19) Licensing & Openness
- Core app closed by default; **export formats and plugin APIs open**.
- Consider dual‑license or MIT for CLI/exporters.

---

## 20) Next Steps
1. Confirm MVP scope + must‑have editors (Conlang, Storyboard, Table, Graph).
2. Approve data shapes and initial adapters (GitHub, Markdown).
3. Build M1 spike: Project/Artifact/Relation + CSV I/O + basic Graph.
4. Prepare templates for Tamenzut, Steamweave, Dustland, Spatch, Darv.

**Creative Atlas** aims to be your playable second brain — one where **the work is the game** and your worlds finally live in one living graph.

