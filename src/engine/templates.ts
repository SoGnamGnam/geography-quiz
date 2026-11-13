// Question templates: each one turns a subject country plus an ordered list of
// candidate countries into a question draft. Option shuffling, ids, timers and
// snapshot dates are handled by the generator.

import type { Country, Ref, ValueSet, WikidataId } from '../domain'
import type { Similarity } from './distractors'
import type { Media, TemplateId } from './types'

export interface OptionDraft {
  /** Identity used to keep options distinct (e.g. sorted QIDs of a set). */
  readonly key: string
  readonly label: string
  readonly media?: Media
}

export interface QuestionDraft {
  readonly prompt: string
  readonly subject?: string
  readonly media?: Media
  readonly correct: OptionDraft
  readonly distractors: readonly OptionDraft[]
}

export interface QuestionTemplate {
  readonly id: TemplateId
  /** Whether the answer can change over time (shows the snapshot date). */
  readonly timeSensitive: boolean
  /** Whether a country can be the subject of (or an option in) this question. */
  isApplicable(country: Country): boolean
  /** Similarity used by the `similar` distractor strategy (default: geographic). */
  readonly similarity?: Similarity
  /**
   * Builds a question with `optionCount - 1` distractors, taken in order from
   * `candidates`. Returns undefined when there are not enough valid candidates.
   */
  build(
    subject: Country,
    candidates: readonly Country[],
    optionCount: number,
  ): QuestionDraft | undefined
}

// ---------------------------------------------------------------------------
// Helpers

const collator = new Intl.Collator('it')

/** Option for a set of references: all names, sorted, joined with commas. */
export function setOption(refs: ValueSet<Ref>): OptionDraft {
  const sorted = [...refs].sort((a, b) => collator.compare(a.name, b.name))
  return {
    key: sorted
      .map((r) => r.id)
      .sort()
      .join('|'),
    label: sorted.map((r) => r.name).join(', '),
  }
}

const countryOption = (c: Country): OptionDraft => ({ key: c.id, label: c.name })

/**
 * Walks `candidates` in order and returns the first `count` options that are
 * distinct from the correct one and from each other, skipping candidates
 * rejected by `skip`. Undefined if fewer than `count` are found.
 */
export function takeDistinct(
  correct: OptionDraft,
  candidates: readonly Country[],
  count: number,
  toOption: (c: Country) => OptionDraft | undefined,
  skip: (c: Country) => boolean = () => false,
): OptionDraft[] | undefined {
  const seen = new Set([correct.key])
  const result: OptionDraft[] = []
  for (const candidate of candidates) {
    if (result.length === count) break
    if (skip(candidate)) continue
    const option = toOption(candidate)
    if (!option || seen.has(option.key)) continue
    seen.add(option.key)
    result.push(option)
  }
  return result.length === count ? result : undefined
}

/**
 * Flags that look the same or nearly the same. Two countries in the same group
 * never appear together in a flag question. Territories that simply use their
 * parent state's flag have no flag in the dataset, so they are not listed here.
 */
export const LOOKALIKE_FLAGS: readonly (readonly WikidataId[])[] = [
  ['Q252', 'Q235'], // Indonesia, Monaco
  ['Q657', 'Q218'], // Chad, Romania
]

function lookalikes(id: WikidataId): ReadonlySet<WikidataId> {
  return new Set(LOOKALIKE_FLAGS.filter((group) => group.includes(id)).flat())
}

/** Similarity on a numeric value, in log scale (2× and ½× are equally far). */
function valueSimilarity(value: (c: Country) => number | undefined): Similarity {
  return (a, b) => {
    const va = value(a)
    const vb = value(b)
    if (!va || !vb) return Infinity
    return Math.abs(Math.log(va) - Math.log(vb))
  }
}

// ---------------------------------------------------------------------------
// Country → value

const countryCapital: QuestionTemplate = {
  id: 'country-capital',
  timeSensitive: true,
  isApplicable: (c) => c.capitals.length > 0,
  build(subject, candidates, optionCount) {
    const correct = setOption(subject.capitals)
    const distractors = takeDistinct(correct, candidates, optionCount - 1, (c) =>
      setOption(c.capitals),
    )
    return (
      distractors && {
        prompt: 'Qual è la capitale di questo paese?',
        subject: subject.name,
        correct,
        distractors,
      }
    )
  },
}

const countryLeader: QuestionTemplate = {
  id: 'country-leader',
  timeSensitive: true,
  isApplicable: (c) => c.leaders.length > 0,
  build(subject, candidates, optionCount) {
    const correct = setOption(subject.leaders)
    const distractors = takeDistinct(correct, candidates, optionCount - 1, (c) =>
      setOption(c.leaders),
    )
    return (
      distractors && {
        prompt: 'Chi guida questo paese (capo di Stato e capo di governo)?',
        subject: subject.name,
        correct,
        distractors,
      }
    )
  },
}

// ---------------------------------------------------------------------------
// Value → country

const capitalCountry: QuestionTemplate = {
  id: 'capital-country',
  timeSensitive: true,
  isApplicable: (c) => c.capitals.length > 0,
  build(subject, candidates, optionCount) {
    const capitalIds = new Set(subject.capitals.map((r) => r.id))
    const distractors = takeDistinct(
      countryOption(subject),
      candidates,
      optionCount - 1,
      countryOption,
      // A country sharing one of the capitals would also be a right answer.
      (c) => c.capitals.some((r) => capitalIds.has(r.id)),
    )
    return (
      distractors && {
        prompt:
          subject.capitals.length > 1
            ? 'Di quale paese sono le capitali?'
            : 'Di quale paese è la capitale?',
        subject: setOption(subject.capitals).label,
        correct: countryOption(subject),
        distractors,
      }
    )
  },
}

function imageToCountry(
  id: TemplateId,
  kind: Media['kind'],
  key: (c: Country) => string | undefined,
  prompt: string,
  skip: (subject: Country) => (c: Country) => boolean = () => () => false,
): QuestionTemplate {
  return {
    id,
    timeSensitive: false,
    isApplicable: (c) => key(c) !== undefined,
    build(subject, candidates, optionCount) {
      const media = key(subject)
      if (!media) return undefined
      const distractors = takeDistinct(
        countryOption(subject),
        candidates,
        optionCount - 1,
        countryOption,
        skip(subject),
      )
      return (
        distractors && {
          prompt,
          media: { kind, key: media },
          correct: countryOption(subject),
          distractors,
        }
      )
    },
  }
}

const flagCountry = imageToCountry(
  'flag-country',
  'flag',
  (c) => c.flag,
  'A quale paese appartiene questa bandiera?',
  (subject) => {
    const similar = lookalikes(subject.id)
    return (c) => similar.has(c.id) || c.flag === subject.flag
  },
)

const silhouetteCountry = imageToCountry(
  'silhouette-country',
  'silhouette',
  (c) => c.silhouette,
  'Quale paese ha questa forma?',
)

const coatOfArmsCountry = imageToCountry(
  'coat-of-arms-country',
  'coat-of-arms',
  (c) => c.coatOfArms,
  'A quale paese appartiene questo stemma?',
)

// ---------------------------------------------------------------------------
// Comparisons

function comparison(
  id: TemplateId,
  value: (c: Country) => number | undefined,
  prompt: string,
  timeSensitive: boolean,
): QuestionTemplate {
  return {
    id,
    timeSensitive,
    isApplicable: (c) => (value(c) ?? 0) > 0,
    similarity: valueSimilarity(value),
    build(subject, candidates, optionCount) {
      // The subject is one of the options; values must all differ so there is
      // exactly one right answer.
      const chosen = [subject]
      const values = new Set([value(subject)])
      for (const candidate of candidates) {
        if (chosen.length === optionCount) break
        const v = value(candidate)
        if (v === undefined || values.has(v)) continue
        values.add(v)
        chosen.push(candidate)
      }
      if (chosen.length < optionCount) return undefined
      const best = chosen.reduce((a, b) => (value(b)! > value(a)! ? b : a))
      return {
        prompt,
        correct: countryOption(best),
        distractors: chosen.filter((c) => c !== best).map(countryOption),
      }
    },
  }
}

const compareArea = comparison(
  'compare-area',
  (c) => c.area,
  'Quale di questi paesi ha la superficie maggiore?',
  false,
)

const comparePopulation = comparison(
  'compare-population',
  (c) => c.population,
  'Quale di questi paesi ha più abitanti?',
  true,
)

// ---------------------------------------------------------------------------

export const TEMPLATES: Readonly<Record<TemplateId, QuestionTemplate>> = {
  'country-capital': countryCapital,
  'capital-country': capitalCountry,
  'flag-country': flagCountry,
  'silhouette-country': silhouetteCountry,
  'coat-of-arms-country': coatOfArmsCountry,
  'country-leader': countryLeader,
  'compare-area': compareArea,
  'compare-population': comparePopulation,
}

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[]

/** Italian names of the templates, for the configuration screen. */
export const TEMPLATE_LABELS: Readonly<Record<TemplateId, string>> = {
  'country-capital': 'Paese → capitale',
  'capital-country': 'Capitale → paese',
  'flag-country': 'Bandiera → paese',
  'silhouette-country': 'Sagoma → paese',
  'coat-of-arms-country': 'Stemma → paese',
  'country-leader': 'Paese → leader',
  'compare-area': 'Confronto di superficie',
  'compare-population': 'Confronto di popolazione',
}
