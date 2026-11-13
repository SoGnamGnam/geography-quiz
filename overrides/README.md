# Manual overrides

Hand-maintained corrections applied by the data pipeline on top of what it reads from Wikidata. They survive every regeneration, so fix wrong or missing data here, never in `data/` (which is overwritten).

## `countries.json`

An object keyed by Wikidata ID. Each entry can use these fields, all optional:

| Field           | Type                                                                                    | Effect                                                                         |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `note`          | string                                                                                  | Why the override exists. Ignored by the pipeline; please always add one.       |
| `include`       | `true`                                                                                  | Adds an item the automatic selection misses (e.g. Abkhazia, with no ISO code). |
| `exclude`       | `true`                                                                                  | Removes an item the automatic selection finds (e.g. Antarctica).               |
| `category`      | `"un-member"` \| `"un-observer"` \| `"partially-recognized"` \| `"dependent-territory"` | Forces the category.                                                           |
| `notoriety`     | 1–5                                                                                     | Replaces the value estimated from the Wikipedia sitelinks count.               |
| `name`          | string                                                                                  | Replaces the Italian name. The Wikidata name becomes an alias.                 |
| `aliases`       | string[]                                                                                | Extra accepted names, added to the Wikidata aliases.                           |
| `removeAliases` | string[]                                                                                | Wikidata aliases to drop.                                                      |
| `patch`         | object                                                                                  | Any `Country` fields, which replace the generated values verbatim.             |

Example:

```json
{
  "Q38": {
    "notoriety": 1,
    "aliases": ["Belpaese"],
    "note": "Italy"
  },
  "Q414": {
    "patch": { "drivingSide": "right" },
    "note": "Wikidata lists both sides"
  }
}
```

The pipeline rejects unknown fields and invalid values, and validates every patched record.

## How the automatic selection and category work

- **Candidates**: every Wikidata item with an ISO 3166-1 alpha-2 code (P297) that has not been dissolved, plus the `include` entries, minus the `exclude` entries.
- **Category**: the override if present; otherwise `un-member` for current UN members, `partially-recognized` for instances of "state with limited recognition" (Q10711424), and `dependent-territory` for the rest.
- **Notoriety**: estimated from the number of Wikipedia editions with an article (≥350 → 1, ≥310 → 2, ≥270 → 3, ≥200 → 4, otherwise 5), until overridden.
