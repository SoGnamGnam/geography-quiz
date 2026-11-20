# World Quiz — Project context

Context document summarizing the decisions made so far. Keep it updated as the project evolves.

## Goal

A geography quiz for personal use, **fully open** and **non-commercial**, playable on Android, iOS and desktop.

- Contains information on every country in the world, their regions, and many other geographic entities (cities, mountains, rivers, lakes, seas, historic sites…).
- Generates quizzes with a user-chosen number of questions and adjustable difficulty.
- Every generation option is customizable, including the difficulty of each individual question type.

## Decisions made

### Platform and stack

- **PWA** (Progressive Web App): a single codebase for mobile and desktop, installable from the home screen, working offline.
- **TypeScript + Svelte + Vite**, with `vite-plugin-pwa` for the service worker and manifest.
- **Tooling**: npm as the package manager, ESLint + Prettier, Vitest for unit tests. There are no GitHub Actions for now; deploy is manual (`npm run deploy`, publishing to the `gh-pages` branch).
- **Font**: Inter, bundled via `@fontsource-variable/inter`.
- **Free static hosting** (GitHub Pages or equivalent). No backend and no remote database.
- Possible future store release via Capacitor, without rewriting the app (not planned for now).

### User, progress and privacy

- **No experience, level or progress system.** No accounts, no login.
- Only persistence (nice to have): **remembering the quiz settings**, via a Svelte store saved to `localStorage`.
- **No personal data collected**:
  - no analytics;
  - no resources loaded from third-party CDNs at runtime (fonts and libraries included in the bundle);
  - no calls to external APIs from the app: all data is included in the bundle.
- The only data outside our control: the hosting provider's standard technical logs (visitor IPs). To be declared with one line in the README.

### Data

- **Main source: Wikidata** (CC0 license, public domain).
- A **build script** queries Wikidata via SPARQL and generates compact JSON files, included in the app and lazy-loaded.
- A **scheduled GitHub Action** (e.g. monthly) regenerates the data, so political offices and capitals stay up to date.
- Each dataset stores the **snapshot date**, shown on questions about data that changes (e.g. "data as of…").
- **Static images** only:
  - country flags: `flag-icons` package (MIT);
  - region flags and coats of arms: Wikimedia Commons (largely public domain, to be verified case by case);
  - **country silhouette**: SVGs generated at build time from Natural Earth borders (public domain).
- **No click-on-the-map questions.**

### Data rules

- **All countries are included**: the 193 UN members, observers (Vatican, Palestine), partially recognized states (Kosovo, Taiwan…) and dependent territories (Greenland, Puerto Rico…). Each carries a category label, which can become a quiz filter.
- **Merged leaders**: president, king, prime minister and similar roles merge into a single "leader" field. The correct answer is the complete set.
- **Multiple values**: when an attribute has several values, the correct answer is the **set of all** values.
  Example: the capital of South Africa is "Pretoria, Cape Town, Bloemfontein".
- **Notoriety**: assigned and flagged **manually** for each entity, on a **1–5 scale** (1 = very well known, 5 = obscure). A quiz includes entities up to its notoriety threshold, so at threshold 5 (maximum difficulty) all entities appear.
  _Proposal to confirm_: use the Wikidata sitelinks count as a suggested initial value, to be corrected by hand.

## Entities and fields

The TypeScript types live in `src/domain/` and are the reference for field names. Data modelling rules:

- Multi-valued attributes are stored as **sets**: JSON arrays with no duplicates and no meaningful order (`ValueSet<T>`). An empty set means unknown or not applicable.
- Links to other items (capital, leader, language, currency…) are stored as **references**: the Wikidata ID plus the Italian label resolved at build time.
- Enum values (category, continent, organization, driving side) are stable English codes; the UI shows their Italian labels.
- Every JSON dataset is wrapped in an envelope with `schemaVersion`, `entityType` and `snapshotDate`.
- Derived values (e.g. population density) are computed at runtime, not stored.

### Fields common to every entity

- Wikidata ID
- Italian name and aliases (alternative names, different spellings)
- Notoriety level
- Coordinates

### 1. Countries

- **Identity**: flag, coat of arms, silhouette, ISO codes (2 and 3 letters), full official name, category (UN / observer / partially recognized / dependent territory)
- **Geography**: continent, subregion, area, bordering countries, sea access yes/no, highest point, time zones
- **Population**: inhabitants, density, demonym
- **Politics**: capital (possibly multiple), form of government, leader (merged field), year of independence, membership in organizations (EU, NATO, UN…)
- **Miscellaneous**: currency, official languages, calling code, internet domain, driving side

### 2. Regions (first-level subdivisions)

- Name, type (region, federal state, province, canton…), parent country
- Capital, area, population
- Flag or coat of arms, if any
- Bordering regions

### 3. Cities

- Country, region, population, elevation
- Whether it is a national or regional capital
- River or sea it lies on

### 4. Relief

- **Mountains and volcanoes**: height, countries, range, volcano yes/no
- **Mountain ranges**: countries, highest peak, length

### 5. Waters

- **Rivers**: length, countries crossed, source, mouth (sea, lake or other river), cities crossed
- **Lakes**: area, maximum depth, countries, elevation, salt yes/no
- **Seas and oceans**: parent ocean, coastal countries, area, maximum depth
- **Straits, gulfs and canals**: countries, seas they connect

### 6. Other landforms

- **Islands and archipelagos**: country or countries, area, population, sea or ocean
- **Peninsulas**: countries, seas that bathe them
- **Deserts**: countries, area, type (hot or cold)
- _Optional_: waterfalls, glaciers, canyons

### 7. Historic and cultural sites

- **UNESCO sites**: country, type (cultural, natural or mixed), year of inscription, nearby city
- Famous non-UNESCO monuments and archaeological sites

## Quiz generator

**Question template** model: each template links an entity type, a property and a question form. Examples:

- country → capital: "What is the capital of X?"
- flag → country: "Which country does this flag belong to?"
- silhouette → country: "Which country has this shape?"
- river → countries: "Which countries does X flow through?"
- comparison: "Which of these is larger?"

**Difficulty levers**, configurable per template:

- number of answer options;
- distractor similarity: random, same continent, or very similar (bordering, similar area…);
- notoriety level of included entities;
- optional timer.

A **quiz configuration** is an object with: number of questions, active templates with weight and difficulty, filters (continent, country category…). This is what gets saved to `localStorage`.

The quiz engine is a **pure TypeScript module**, separate from the UI and testable.

### Engine design (implemented in `src/engine/`)

- **Question = prompt + subject.** The prompt never names the subject ("Qual è la capitale di questo paese?") and the UI shows the subject ("Italia") separately. This avoids Italian articulated prepositions ("dell'Italia", "del Perù", "degli Stati Uniti"), which would need gender and number data.
- **Single choice.** Every question has one correct option. For set answers, each option is a whole set: the correct option is the subject's full set, and the **distractors are the sets of other countries** (e.g. "La Paz, Sucre" as a wrong answer for South Africa). Set values are listed alphabetically.
- **Templates**: country → capital, capital → country, flag → country, silhouette → country, coat of arms → country, country → leader, larger area, larger population. Capital, leader and population questions show the snapshot date.
- **Distractor strategies**: `random`; `same-continent` (same continent first, then the rest); `similar` (bordering countries, then by distance; for comparisons, countries with the closest value in log scale). The closest candidates are lightly shuffled, so a subject does not always get the same distractors.
- **Pools**: subjects and distractors come from the countries that pass the quiz filters (continent, category) and the template's notoriety threshold. When that pool is too small for the requested number of options, distractors fall back to the same filters at any notoriety.
- **Generation**: templates are chosen by weight; a subject is never repeated with the same template, and the same country is not the subject of two consecutive questions when avoidable. The quiz is shorter than requested when the filters leave too few subjects (`requestedCount` tells the UI). A seed makes every quiz reproducible.
- **Ambiguity guards**: in capital → country, countries sharing a capital are never offered together. In flag questions, look-alike flags (Indonesia/Monaco, Chad/Romania) are never offered together. Territories that use their parent's flag have no flag in the dataset: the pipeline detects them by comparing rendered pixels.
- **Defaults** (`defaultQuizConfig`): 10 questions, 4 options, same-continent distractors, notoriety ≤ 3. Every template is enabled except coat of arms and leader; comparisons have half weight.

### UI (implemented in `src/screens/`)

- Four screens: configuration (question count, continent and category filters, and per-template frequency, number of options, distractor type, notoriety and timer), play, results (score, per-template breakdown, review of every answer) and credits (data sources and the author and license of every coat of arms).
- Play: options can be chosen with the number keys; after answering, the correct option is highlighted and "Avanti" moves on. "Salta" or an expired timer counts as skipped. Time-sensitive questions show "Dati aggiornati al <date>".
- The country dataset is a separate chunk, loaded on start. Flags are separate files (not inlined), silhouettes are drawn with a CSS mask so they follow the theme colour, and every asset is precached for offline use (about 7 MB).
- Light and dark themes follow the system setting.

## Special cases to handle

- Countries with multiple capitals (South Africa, Bolivia…).
- Multiple official languages.
- Rivers forming a border; mountains and lakes straddling a border.
- Regions without a flag or coat of arms.
- Leaders and capitals that change over time, covered by the snapshot date.

## Project name

**World Quiz** (npm package `world-quiz`; also the PWA name).

## Data pipeline (countries)

Implemented in `scripts/countries/` and run with `npm run data:countries`. It writes `data/countries.json` (one country per line, for readable diffs), `public/silhouettes/<QID>.svg`, `public/coats-of-arms/<QID>.webp` and `data/attributions/coats-of-arms.json`, and refreshes the coat-of-arms table in `THIRD_PARTY.md`.

- **Selection**: every Wikidata item with an ISO 3166-1 alpha-2 code that has not been dissolved, adjusted by the overrides (Antarctica and ISO "reserved" codes are excluded; Abkhazia, South Ossetia, Northern Cyprus, Transnistria, Somaliland and the Sahrawi Republic are included by hand). Result: 255 entries, i.e. 193 UN members, 2 observers, 8 partially recognized states and 52 dependent territories.
- **Category**: UN membership from Wikidata, observers set by hand, otherwise "state with limited recognition" → partially recognized, everything else → dependent territory. Denmark needs an override, because Wikidata records the UN seat on the Kingdom of Denmark.
- **Values**: only best-ranked statements; for capitals, leaders, currencies and organizations, statements with an end date are dropped. Population takes the most recent figure. Only the ASCII two-letter TLD is kept.
- **Independence year**: Wikidata has no consistent "independence" property, so this is the inception year (P571) of the current state (e.g. Italy → 1946, the Republic). It is left empty for dependent territories. Treat it with care in question templates.
- **Notoriety**: seeded from the sitelinks count, with thresholds in `scripts/countries/assemble.ts`, and corrected in the overrides file.
- **Manual overrides**: `overrides/countries.json`, a JSON object keyed by QID (format in `overrides/README.md`). Overrides are applied on every regeneration.
- **Silhouettes**: Natural Earth 1:10m, matched by Wikidata ID (then ISO alpha-3). Far-away parts are dropped (a part is kept if it lies within 800 km of a part already kept), then the shape is projected with an equal-area projection centred on the country, simplified, and written as a single `currentColor` path. Missing: Abkhazia, South Ossetia, Transnistria and the Sahrawi Republic, which Natural Earth does not separate.
- **Coats of arms**: from Commons (P94), as standard 330px thumbnails re-encoded to 200px WebP (about 4 MB in total). Turkey has none.
- **Flags**: `flag-icons` codes (lowercase ISO alpha-2); missing for the 6 partially recognized states without an ISO code. Dependent territories whose flag renders the same as another country's (French overseas territories, Svalbard, Heard Island…) get no flag, because a flag question about them would be unanswerable.
- **Refresh**: manual for now (`npm run data:countries -- --refresh`). The monthly GitHub Action was removed and can be restored from git history (`.github/workflows/data.yml`).

## Open points

- Notoriety at scale (thousands of entities in M7): the sitelinks-based seed plus overrides works for countries; revisit for cities, rivers, etc.

## Licensing

- **Code**: GPL-3.0 (`LICENSE`).
- **Generated data** (everything under `data/`): CC0-1.0 (`data/LICENSE`), matching the Wikidata and Natural Earth sources.
- Third-party assets keep their own licenses: `flag-icons` (MIT) and Wikimedia Commons images (per file, to be listed in an attribution file).

## Repository layout

- `src/engine/`: the pure TypeScript quiz engine (no UI imports).
- `src/`: the Svelte UI.
- `public/icon.svg`: the source for all PWA icons, which are generated at build time.
- `data/`: generated JSON datasets, committed to the repo and refreshed by the scheduled Action.
- Raw downloads and SPARQL caches (`.cache/`, `scripts/.cache/`, `data/raw/`) are git-ignored.

## Next steps

Tracked in `BACKLOG.md`, organized by milestone (M0 setup → M6 deploy, then M7 more entities).
