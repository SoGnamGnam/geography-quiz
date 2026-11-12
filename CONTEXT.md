# Geo Quiz — Project context

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
- **Notoriety**: assigned and flagged **manually** for each entity. At maximum difficulty all entities appear.
  *Proposal to confirm*: use the Wikidata sitelinks count as a suggested initial value, to be corrected by hand.

## Entities and fields

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
- *Optional*: waterfalls, glaciers, canyons

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

## Special cases to handle

- Countries with multiple capitals (South Africa, Bolivia…).
- Multiple official languages.
- Rivers forming a border; mountains and lakes straddling a border.
- Regions without a flag or coat of arms.
- Leaders and capitals that change over time, covered by the snapshot date.

## Open points

- Distractors for multiple-answer questions: e.g. other plausible sets ("Pretoria, Durban, Johannesburg"), or sets from other countries.
- How to manage manual notoriety across thousands of entities (override file, default values).
- Project name.

## Licensing

- **Code**: GPL-3.0 (`LICENSE`).
- **Generated data** (everything under `data/`): CC0-1.0 (`data/LICENSE`), matching the Wikidata and Natural Earth sources.
- Third-party assets keep their own licenses: `flag-icons` (MIT) and Wikimedia Commons images (per file, to be listed in an attribution file).

## Repository layout (planned)

- `data/`: generated JSON datasets, committed to the repo and refreshed by the scheduled Action.
- Raw downloads and SPARQL caches (`.cache/`, `scripts/.cache/`, `data/raw/`) are git-ignored.

## Next steps

Tracked in `BACKLOG.md`, organized by milestone (M0 setup → M6 deploy, then M7 more entities).
