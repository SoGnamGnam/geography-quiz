# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Project name: **World Quiz** (npm package `world-quiz`). The toolchain is scaffolded, and the app is a placeholder screen. `CONTEXT.md` is the design document and source of truth for every decision so far. Read it before starting any work, and keep it updated when decisions change or open points are resolved. `BACKLOG.md` tracks implementation work by milestone; tick items off as they land.

Licenses: code is GPL-3.0 (`LICENSE`), generated data under `data/` is CC0-1.0 (`data/LICENSE`). Add every new third-party asset or data source to `THIRD_PARTY.md`.

## Commands

Package manager: **npm** (commit `package-lock.json`; CI uses `npm ci`).

- `npm run dev`: dev server
- `npm run build`: production build into `dist/` (also generates the service worker and PWA icons from `public/icon.svg`)
- `npm run preview`: serve the production build locally (use this to test offline/PWA behaviour)
- `npm run check`: typecheck (`svelte-check` for the app, `tsc` for the config files)
- `npm run lint`: ESLint + Prettier check; `npm run format` rewrites files
- `npm test`: Vitest, a single run; `npm run test:watch` for watch mode
- A single test: `npx vitest run src/engine/index.test.ts` or `npx vitest run -t "test name"`
- `npm run data:countries`: regenerate `data/countries.json`, the silhouettes and the coats of arms (uses the cache in `scripts/.cache/`; add `-- --refresh` to re-query Wikidata). Needs network access on the first run.

CI (`.github/workflows/ci.yml`) runs lint, check, test and build on every push to `main` and on every PR. `.github/workflows/data.yml` refreshes the data monthly and opens a PR.

## Code layout

- `src/domain/`: entity types (`Country`…), the dataset envelope, set helpers and Italian labels for enums. Pure TypeScript, shared by the engine, the UI and the data pipeline. Bump `SCHEMA_VERSION` on any breaking change to the types.
- `src/engine/`: the quiz engine. Pure TypeScript, so it must never import Svelte, the DOM or UI modules (`tsconfig.scripts.json` typechecks it without DOM types, so such an import fails the check). Entry point `generateQuiz(data, config, seed)`; templates live in `templates.ts` (add a template there plus its id in `types.ts`, its label and its default in `config.ts`). `fixtures.ts` is a small hand-made dataset for tests; `data.test.ts` runs the engine on the real `data/countries.json`. Tests sit next to the code as `*.test.ts`.
- `src/`: Svelte UI (`main.ts`, `App.svelte`, `app.css`).
- `scripts/`: the build-time data pipeline (Node + `tsx`, typechecked with `tsconfig.scripts.json`). `scripts/lib/` holds the generic SPARQL, Commons, validation and output helpers; `scripts/countries/` holds the country-specific queries, the pure `assemble.ts` (unit-tested), silhouettes and coats of arms.
- `overrides/`: hand-written corrections applied on every regeneration (format in `overrides/README.md`). Fix data here, never by editing `data/` directly.
- `data/`: generated, committed datasets. `public/silhouettes/` and `public/coats-of-arms/` are generated as well. The coat-of-arms table in `THIRD_PARTY.md` is generated between marker comments.
- `public/icon.svg`: the single source for every PWA icon (`pwa-assets.config.ts`).
- Font: Inter, bundled through `@fontsource-variable/inter` (never load fonts from a CDN).

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
- **Multi-valued attributes**: the correct answer is the _full set_ of values (e.g. South Africa's capital = "Pretoria, Cape Town, Bloemfontein"). All head-of-state/government roles are merged into a single `leader` field, also answered as a set.
- **Include all countries**: UN members, observers, partially recognized states and dependent territories, each tagged with a category that can be used as a quiz filter.
- **Notoriety** is assigned per entity by hand. At maximum difficulty every entity can appear.
- UI text and data are in **Italian** (Italian names plus aliases).
- All project documentation (`CONTEXT.md`, `README.md`, `CLAUDE.md`, code comments, any new docs) is written in **English**.
