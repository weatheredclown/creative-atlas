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
- [x] Project selection across Sacred Truth, Dustland, Aputi, and more.
- [x] Core artifact types at launch (characters, timelines, locations, rules/systems, terminology, scenes/chapters, game modules/quests).
- [x] Rich text editor with Markdown and AI assist.
- [x] Relationship graph linking characters ↔ events ↔ worlds.
- [x] Import pipelines for Markdown and text dumps (chat, drafts).
- [x] Export pipelines for chapter bible PDF/Markdown and lore JSON for game engines (Dustland ACK modules).
- [x] "Add one fact" button to reduce overwhelm.
- [x] World dashboards to add lore, visualize connections, and link crossover projects (Dustland NPC ←→ Sacred Truth vampire cameo).
- [x] "Reveal depth" toggle for simple → detailed fields.
- [x] "Narrative need heatmap" that flags characters not seen recently.
- [x] Memory sync with Gemini-powered conversations gated by user approval.

### Phase 2 — Gamification & XP Loop
"Writing and making worlds gives XP. Lorebuilding is a game."
- [x] XP system tied to adding artifacts, refining drafts, importing pages, and completing quests.
- [x] Daily challenge board to surface fresh prompts.
- [x] Level-up tree with creativity perks (Lore Weaver, Archivist, World Alchemist, Dungeon Master).
- [x] Collectible inspiration cards covering archetypes, vibes, visual prompts, and genre modifiers.
- [x] Player profile with creative streak tracking.
- [x] Inspiration deck draw interface for mid-writing boosts.

### Phase 3 — World Simulation Layer
"World memory and logic enforcement."
- [x] Time and continuity tracking across worlds.
- [x] Lore validator to prevent contradictions against canon.
- [ ] Magic system structure builder (Tamenzut rules encoded).
- [ ] Physics/metaphysics constraint annotations.
- [ ] "World age" progression that evolves lore events.
- [ ] Factions and conflicts system for PIT, Dustland, and the 4X project.
- [ ] Simulated history heatmap and "What changed this century?" views.
- [ ] NPC memory map linking Dustland, Sacred Truth, Spatch, and beyond.

### Phase 4 — Narrative & Game Pipelines
Stories become game worlds, and game worlds fuel story arcs.
- [x] Scene board for novels and narrative arcs.
- [x] Quest board for game modules.
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
- [x] Publisher Mode that turns the atlas into a website/wiki.
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

- [x] Provide onboarding quests and tooltips that introduce graph navigation, publishing, and import/export power features.
- [ ] Migrate storage to the managed backend plan in `docs/firebase-backend-migration.md`, including auth, persistence, and role-aware access.
