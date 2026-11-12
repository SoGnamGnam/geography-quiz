# Backlog

Implementation backlog, ordered by milestone. `CONTEXT.md` remains the source of truth for design decisions; this file tracks *work*. Tick items as they land and add new ones at the bottom of the right milestone.

Legend: `[ ]` to do · `[x]` done · **(decision)** needs a choice before it can start.

## M0 — Repository setup

- [x] `.gitignore` (Node/Vite/PWA, data-pipeline caches, editors, OS, future Capacitor outputs)
- [x] License: code under **GPL-3.0** (`LICENSE`), generated data under **CC0-1.0** (`data/LICENSE`)
- [ ] README: description, license summary, privacy note (hosting logs only), dev commands
- [ ] `THIRD_PARTY.md`: attribution for Wikidata, Natural Earth, flag-icons, and each Wikimedia Commons image with its license
- [ ] **(decision)** Project name (also sets the PWA name and the repo name)
- [ ] `.editorconfig`

## M1 — Toolchain

- [ ] Scaffold Vite + Svelte + TypeScript (strict mode)
- [ ] **(decision)** Package manager (npm / pnpm)
- [ ] ESLint + Prettier (with the Svelte plugins)
- [ ] Vitest for unit tests
- [ ] Bundle a self-hosted font (no CDN)
- [ ] `vite-plugin-pwa`: manifest, icons, offline precaching
- [ ] CI workflow: lint, typecheck, test, build on every push/PR
- [ ] Add the real build/lint/test commands to `CLAUDE.md`

## M2 — Domain types

- [ ] Common entity fields: Wikidata ID, Italian name + aliases, notoriety, coordinates
- [ ] `Country` type (identity, geography, population, politics, misc), including the category enum (UN member / observer / partially recognized / dependent territory)
- [ ] Multi-valued fields modelled as sets (capital, leader, languages, borders…)
- [ ] Dataset envelope with `snapshotDate` and schema version
- [ ] Types for regions, cities, relief, waters, landforms, sites (can follow later, one per milestone in M7)

## M3 — Data pipeline: countries

- [ ] SPARQL client script (Node, run at build time, with on-disk response cache)
- [ ] Country list query covering all four categories; verify count and edge cases (Vatican, Palestine, Kosovo, Taiwan, Greenland, Puerto Rico…)
- [ ] Property queries: capital(s), leader (merge all head-of-state/government roles), area, population, borders, currency, languages, ISO codes, calling code, TLD, driving side, independence, organizations
- [ ] Italian labels + aliases; manual alias override file
- [ ] Notoriety: initial value from the sitelinks count + manual override file **(decision: override file format)**
- [ ] Output compact JSON to `data/` with snapshot date; schema validation step
- [ ] Flags via `flag-icons`; map ISO codes, handle territories with no flag in the package
- [ ] Silhouettes: download Natural Earth, generate simplified SVG per country
- [ ] Coats of arms from Wikimedia Commons, recording the license of each file
- [ ] Scheduled GitHub Action (monthly) that regenerates data and opens a PR with the diff

## M4 — Quiz engine (pure TS, no UI imports)

- [ ] Seeded RNG so quizzes are reproducible in tests
- [ ] Question template interface: entity type + property + question form
- [ ] Templates: country → capital, capital → country, flag → country, silhouette → country, country → leader, comparison (larger area / population)
- [ ] Set-valued answers (full set is the correct answer)
- [ ] Distractor strategies: random, same continent, very similar (bordering, similar area) **(decision: distractors for set answers — open point in CONTEXT.md)**
- [ ] Filters: continent, country category, notoriety threshold
- [ ] Quiz configuration object + quiz generator (question count, weighted templates, per-template difficulty)
- [ ] Answer checking and result summary
- [ ] Unit tests for every template and special case (multiple capitals, multiple languages, missing flag/coat of arms)

## M5 — Minimal UI

- [ ] Configuration screen (count, templates, weights, difficulty, filters)
- [ ] Persist the configuration via a Svelte store backed by `localStorage`
- [ ] Play screen: question, options, optional timer, "data as of…" for time-sensitive questions
- [ ] Results screen
- [ ] Lazy-load datasets per entity type
- [ ] Italian UI copy; responsive layout for phone and desktop
- [ ] Accessibility pass (keyboard, contrast, screen-reader labels)

## M6 — Deploy

- [ ] GitHub Pages workflow (correct `base` path for the PWA)
- [ ] Verify offline install on Android, iOS and desktop
- [ ] Verify no runtime network requests (devtools audit)

## M7 — More entities (one at a time: types → pipeline → templates)

- [ ] Regions (first-level subdivisions), incl. flags/coats of arms
- [ ] Cities
- [ ] Mountains, volcanoes, mountain ranges
- [ ] Rivers, lakes, seas and oceans, straits/gulfs/canals
- [ ] Islands, peninsulas, deserts (optional: waterfalls, glaciers, canyons)
- [ ] UNESCO sites and other monuments

## Later / maybe

- [ ] Capacitor wrapper for app stores (note: GPL-3.0 and the Apple App Store terms are a known friction point; fine while there is a single copyright holder)
