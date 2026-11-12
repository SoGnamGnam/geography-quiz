# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-implementation: the repo has no code, build setup, or tests yet. `CONTEXT.md` is the design document and source of truth for every decision so far. Read it before starting any work, and keep it updated when decisions change or open points are resolved. `BACKLOG.md` tracks implementation work by milestone; tick items off as they land. Once a toolchain exists, add the real build/lint/test commands to this file.

Licenses: code is GPL-3.0 (`LICENSE`), generated data under `data/` is CC0-1.0 (`data/LICENSE`).

## Planned stack

- **PWA** built with **TypeScript + Svelte + Vite**, using `vite-plugin-pwa` for the service worker and manifest. One codebase for Android, iOS and desktop, and it must work offline.
- Static hosting only (GitHub Pages or similar). No backend and no remote database. Capacitor may wrap it later; don't make choices that would block that.

## Architecture (as designed)

- **Data pipeline (build time)**: a script queries **Wikidata via SPARQL** and writes compact JSON files that ship in the bundle and are lazy-loaded at runtime. A scheduled GitHub Action (e.g. monthly) regenerates them. Each dataset records its **snapshot date**, which is shown on questions about data that changes over time (leaders, capitals).
- **Images**: country flags come from the `flag-icons` npm package. Region flags and coats of arms come from Wikimedia Commons (check each license). Country silhouettes are SVGs generated at build time from Natural Earth borders.
- **Quiz engine**: a **pure TypeScript module, separate from the UI** and testable on its own. It is built on **question templates** (entity type + property + question form, e.g. country → capital, flag → country, silhouette → country, comparisons). Difficulty settings for each template: number of answer options, how similar the distractors are (random / same continent / very similar), the notoriety threshold, and an optional timer.
- **Quiz configuration**: an object holding the question count, the active templates with their weight and difficulty, and filters (continent, country category). It is the only thing persisted, through a Svelte store saved to `localStorage`.

## Hard constraints

- **No personal data**: no analytics, no accounts, no progress/XP/levels, and no network calls from the app at runtime. No CDN-loaded assets: fonts and libraries must be bundled, and all data ships in the bundle.
- **No map-click questions.**
- **Multi-valued attributes**: the correct answer is the *full set* of values (e.g. South Africa's capital = "Pretoria, Cape Town, Bloemfontein"). All head-of-state/government roles are merged into a single `leader` field, also answered as a set.
- **Include all countries**: UN members, observers, partially recognized states and dependent territories, each tagged with a category that can be used as a quiz filter.
- **Notoriety** is assigned per entity by hand. At maximum difficulty every entity can appear.
- UI text and data are in **Italian** (Italian names plus aliases).
- All project documentation (`CONTEXT.md`, `README.md`, `CLAUDE.md`, code comments, any new docs) is written in **English**.
