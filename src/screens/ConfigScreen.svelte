<script lang="ts">
  import {
    CONTINENTS,
    CONTINENT_LABELS,
    COUNTRY_CATEGORIES,
    COUNTRY_CATEGORY_LABELS,
    NOTORIETY_LEVELS,
    type Notoriety,
  } from '../domain'
  import {
    DISTRACTOR_STRATEGIES,
    MAX_OPTIONS,
    MAX_QUESTIONS,
    MIN_OPTIONS,
    MIN_QUESTIONS,
    TEMPLATE_IDS,
    TEMPLATE_LABELS,
    applyFilters,
    type DistractorStrategy,
    type QuizData,
  } from '../engine'
  import { DISTRACTOR_LABELS, NOTORIETY_LABELS, TIMER_OPTIONS, WEIGHT_OPTIONS } from '../lib/labels'
  import {
    clearFilter,
    quizConfig,
    resetConfig,
    setDifficulty,
    setQuestionCount,
    setTemplate,
    toggleFilter,
  } from '../lib/settings'

  interface Props {
    data: QuizData | undefined
    onstart: () => void
  }

  let { data, onstart }: Props = $props()

  const optionCounts = Array.from(
    { length: MAX_OPTIONS - MIN_OPTIONS + 1 },
    (_, i) => i + MIN_OPTIONS,
  )

  let matching = $derived(data ? applyFilters(data.countries, $quizConfig.filters).length : 0)
  let anyTemplate = $derived(
    TEMPLATE_IDS.some(
      (id) => $quizConfig.templates[id].enabled && $quizConfig.templates[id].weight > 0,
    ),
  )
  let canStart = $derived(data !== undefined && anyTemplate && matching > 0)

  function onCount(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value)
    if (Number.isFinite(value)) setQuestionCount(value)
  }

  function nearestWeight(weight: number): number {
    return WEIGHT_OPTIONS.reduce((best, o) =>
      Math.abs(o.value - weight) < Math.abs(best.value - weight) ? o : best,
    ).value
  }
</script>

<section class="config" aria-labelledby="config-title">
  <h2 id="config-title" class="visually-hidden">Impostazioni del quiz</h2>

  <div class="card block">
    <label class="count">
      <span class="label">Numero di domande</span>
      <input
        type="number"
        inputmode="numeric"
        min={MIN_QUESTIONS}
        max={MAX_QUESTIONS}
        value={$quizConfig.questionCount}
        onchange={onCount}
      />
    </label>
  </div>

  <fieldset class="card block">
    <legend>Continenti</legend>
    <div class="chips">
      <button
        type="button"
        class="chip"
        aria-pressed={$quizConfig.filters.continents.length === 0}
        onclick={() => clearFilter('continents')}>Tutti</button
      >
      {#each CONTINENTS.filter((c) => c !== 'antarctica') as continent (continent)}
        <button
          type="button"
          class="chip"
          aria-pressed={$quizConfig.filters.continents.includes(continent)}
          onclick={() => toggleFilter('continents', continent)}
          >{CONTINENT_LABELS[continent]}</button
        >
      {/each}
    </div>
  </fieldset>

  <fieldset class="card block">
    <legend>Tipi di paese</legend>
    <div class="chips">
      <button
        type="button"
        class="chip"
        aria-pressed={$quizConfig.filters.categories.length === 0}
        onclick={() => clearFilter('categories')}>Tutti</button
      >
      {#each COUNTRY_CATEGORIES as category (category)}
        <button
          type="button"
          class="chip"
          aria-pressed={$quizConfig.filters.categories.includes(category)}
          onclick={() => toggleFilter('categories', category)}
          >{COUNTRY_CATEGORY_LABELS[category]}</button
        >
      {/each}
    </div>
    {#if data}
      <p class="muted small" aria-live="polite">
        {matching === 1 ? '1 paese corrisponde' : `${matching} paesi corrispondono`} ai filtri.
      </p>
    {/if}
  </fieldset>

  <h3 class="section-title">Tipi di domanda</h3>
  <ul class="templates">
    {#each TEMPLATE_IDS as id (id)}
      {@const template = $quizConfig.templates[id]}
      <li class="card template" class:off={!template.enabled}>
        <label class="toggle">
          <input
            type="checkbox"
            checked={template.enabled}
            onchange={(e) => setTemplate(id, { enabled: e.currentTarget.checked })}
          />
          <span class="template-name">{TEMPLATE_LABELS[id]}</span>
        </label>

        {#if template.enabled}
          <div class="settings">
            <label>
              <span class="label">Frequenza</span>
              <select
                value={nearestWeight(template.weight)}
                onchange={(e) => setTemplate(id, { weight: Number(e.currentTarget.value) })}
              >
                {#each WEIGHT_OPTIONS as option (option.value)}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </label>
            <label>
              <span class="label">Opzioni</span>
              <select
                value={template.difficulty.optionCount}
                onchange={(e) => setDifficulty(id, { optionCount: Number(e.currentTarget.value) })}
              >
                {#each optionCounts as count (count)}
                  <option value={count}>{count}</option>
                {/each}
              </select>
            </label>
            <label>
              <span class="label">Risposte sbagliate</span>
              <select
                value={template.difficulty.distractors}
                onchange={(e) =>
                  setDifficulty(id, {
                    distractors: e.currentTarget.value as DistractorStrategy,
                  })}
              >
                {#each DISTRACTOR_STRATEGIES as strategy (strategy)}
                  <option value={strategy}>{DISTRACTOR_LABELS[strategy]}</option>
                {/each}
              </select>
            </label>
            <label>
              <span class="label">Paesi inclusi</span>
              <select
                value={template.difficulty.maxNotoriety}
                onchange={(e) =>
                  setDifficulty(id, {
                    maxNotoriety: Number(e.currentTarget.value) as Notoriety,
                  })}
              >
                {#each NOTORIETY_LEVELS as level (level)}
                  <option value={level}>{NOTORIETY_LABELS[level]}</option>
                {/each}
              </select>
            </label>
            <label>
              <span class="label">Tempo</span>
              <select
                value={template.difficulty.timeLimitSeconds ?? 0}
                onchange={(e) =>
                  setDifficulty(id, { timeLimitSeconds: Number(e.currentTarget.value) })}
              >
                {#each TIMER_OPTIONS as option (option.value)}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </label>
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <div class="actions">
    {#if !anyTemplate}
      <p class="warning" role="status">Attiva almeno un tipo di domanda.</p>
    {:else if data && matching === 0}
      <p class="warning" role="status">Nessun paese corrisponde ai filtri scelti.</p>
    {/if}
    <button type="button" class="btn btn-primary start" disabled={!canStart} onclick={onstart}>
      {data ? 'Inizia il quiz' : 'Caricamento dati…'}
    </button>
    <button type="button" class="btn-link" onclick={resetConfig}>Ripristina impostazioni</button>
  </div>
</section>

<style>
  .config {
    display: grid;
    gap: 1rem;
  }

  .block {
    padding: 1rem;
    margin: 0;
    min-width: 0;
  }

  fieldset.block {
    border: 1px solid var(--border);
  }

  legend {
    font-weight: 700;
    padding: 0;
    float: left;
    width: 100%;
    margin-bottom: 0.75rem;
  }

  .count {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .count .label {
    font-weight: 700;
  }

  .count input {
    width: 6rem;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    text-align: center;
  }

  .chips {
    clear: both;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    min-height: 2.5rem;
    padding: 0.4rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
  }

  .chip[aria-pressed='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }

  .small {
    font-size: 0.875rem;
    margin: 0.75rem 0 0;
  }

  .section-title {
    font-size: 1rem;
    margin-top: 0.5rem;
  }

  .templates {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .template {
    padding: 0.75rem 1rem;
  }

  .template.off {
    box-shadow: none;
    background: transparent;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.5rem;
    cursor: pointer;
  }

  .toggle input {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: var(--accent);
  }

  .template-name {
    font-weight: 600;
  }

  .settings {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .settings label {
    display: grid;
    gap: 0.25rem;
  }

  .settings .label {
    font-size: 0.8125rem;
    color: var(--muted);
  }

  select {
    width: 100%;
    min-height: 2.5rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
  }

  .actions {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0 1rem;
  }

  .start {
    width: 100%;
    max-width: 20rem;
    font-size: 1.125rem;
  }

  .warning {
    margin: 0;
    color: var(--wrong);
    font-weight: 600;
  }
</style>
