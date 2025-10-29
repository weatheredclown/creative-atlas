# Dustland Project Overview

Dustland is a hybrid of retro RPG, world-simulation framework, and interactive art experiment. This document captures its current creative direction, technical shape, and integration points with the Creative Atlas workspace.

## 1. Core Concept
- Pixel-art RPG staged through a custom CRT-style rendering stack.
- Modular storytelling platform that supports interactive fiction, tactical encounters, and mood-driven art pieces.
- Built around persona masks (identity loadouts), event-driven modules, and AI-assisted content pipelines.
- Actively developed as an open, Yarn/Turbo-powered TypeScript/JavaScript monorepo hosted at `weatheredclown/dustland`.

## 2. Architecture & Systems
- **AdventureKit (ACK):** Scriptable module runner that orchestrates quests, combat vignettes, and branching story beats.
- **Persona Masks:** Collectible identities that players equip to alter stats, unlock dialogue, and surface hidden routes.
- **World Memory System:** Persists environmental state, narrative consequences, and player choices across sessions.
- **Effect Packs & Profiles:** Event-triggered bundles that reshape the world (weather shifts, NPC behavior, art overlays).
- **CRT Overlay Engine:** Shader pipeline that produces phosphor glow, scanlines, ghosting, and distortion for a nostalgia-heavy presentation.
- **AI Generators:** Portraits, dialogue, music loops, and pixel tiles seeded via local + cloud diffusion and Magenta/Tone.js workflows.

## 3. Setting & Tone
- Post-collapse desert world built on top of forgotten machines and eroded mythologies.
- Survivors survive by wearing "borrowed" identities; every persona leaves echoes in dialogue, lore, and stats.
- Aesthetic blend of NES/SNES-era RPGs, ruinpunk sci-fi, and lyrical myth.
- Interactive melancholy is core: player choices leave visible scars on maps, NPCs, and soundtrack treatments.

## 4. Themes
- **Identity & Memory:** Masks blur the line between true self and curated persona.
- **Decay & Persistence:** Civilizations fail, but narrative traces and player-authored memories linger.
- **Technology as Myth:** Machine remnants function as deities; rituals are firmware updates disguised as prophecy.
- **Agency via Masks:** Experimenting with personas reveals how malleable and fragile identity can be.
- Dustland acts as a playable echo of other universes (Tamenzut, Sacred Truth, Spatch), making it a narrative meta-portal.

## 5. Technical & Artistic Goals
- Keep systems modular, data-driven, and serializable (JSON/YAML) for remixing and export.
- Embrace AI-assist for NPC portraits, procedural dialogue, music sketches, and sprite work to accelerate iteration.
- Support gamified creativity: authoring new lore, gear, and adventures doubles as playing the game.
- Integrate with Creative Atlas by treating Dustland modules, masks, and world memories as first-class artifacts.

## 6. Long-Term Vision
- Dustland doubles as part of the broader "creative codex"—a living application that catalogs stories, conlangs, art, and games.
- Serves as a memory system: modules become snapshots of evolving worlds, while Creative Atlas tracks the production pipeline.
- Future milestones focus on deeper simulation layers, collaborative module authoring, and exportable story bundles.
