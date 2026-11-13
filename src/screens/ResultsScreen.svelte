<script lang="ts">
  import QuestionMedia from '../components/QuestionMedia.svelte'
  import { TEMPLATE_LABELS, summarize, type Answer, type Quiz, type TemplateId } from '../engine'

  interface Props {
    quiz: Quiz
    answers: Answer[]
    onreplay: () => void
    onsettings: () => void
  }

  let { quiz, answers, onreplay, onsettings }: Props = $props()

  let result = $derived(summarize(quiz, answers))
  let percent = $derived(result.total ? Math.round((result.correct / result.total) * 100) : 0)
  let byTemplate = $derived(
    (Object.entries(result.byTemplate) as [TemplateId, { total: number; correct: number }][]).sort(
      (a, b) => b[1].total - a[1].total,
    ),
  )

  function labelOf(questionIndex: number, optionId: string | null): string {
    if (optionId === null) return '—'
    return (
      result.items[questionIndex]!.question.options.find((o) => o.id === optionId)?.label ?? '—'
    )
  }

  let headingEl = $state<HTMLElement>()
  $effect(() => {
    headingEl?.focus()
  })
</script>

<section class="results" aria-labelledby="results-title">
  <div class="card summary">
    <h2 id="results-title" tabindex="-1" bind:this={headingEl}>Risultato</h2>
    <p class="score">
      <strong>{result.correct}</strong><span class="muted">&nbsp;/&nbsp;{result.total}</span>
    </p>
    <p class="muted">
      {percent}% di risposte esatte
      {#if result.skipped > 0}
        · {result.skipped} {result.skipped === 1 ? 'saltata' : 'saltate'}
      {/if}
    </p>
    {#if quiz.questions.length < quiz.requestedCount}
      <p class="note">
        Avevi chiesto {quiz.requestedCount} domande, ma con i filtri scelti ne sono disponibili solo {quiz
          .questions.length}.
      </p>
    {/if}
    <div class="actions">
      <button type="button" class="btn btn-primary" onclick={onreplay}>Nuovo quiz</button>
      <button type="button" class="btn" onclick={onsettings}>Modifica impostazioni</button>
    </div>
  </div>

  {#if byTemplate.length > 1}
    <div class="card block">
      <h3>Per tipo di domanda</h3>
      <table>
        <tbody>
          {#each byTemplate as [id, stats] (id)}
            <tr>
              <th scope="row">{TEMPLATE_LABELS[id]}</th>
              <td>{stats.correct} / {stats.total}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="block">
    <h3>Le tue risposte</h3>
    <ol class="review">
      {#each result.items as item, i (item.question.id)}
        <li class="card item {item.outcome}">
          <div class="item-head">
            <span class="badge" aria-hidden="true">{item.outcome === 'correct' ? '✓' : '✗'}</span>
            <span class="visually-hidden">
              {item.outcome === 'correct'
                ? 'Esatta'
                : item.outcome === 'wrong'
                  ? 'Sbagliata'
                  : 'Saltata'}:
            </span>
            <span>
              {item.question.prompt}
              {#if item.question.subject}<strong> {item.question.subject}</strong>{/if}
            </span>
          </div>
          {#if item.question.media}
            <div class="thumb"><QuestionMedia media={item.question.media} /></div>
          {/if}
          <dl>
            {#if item.outcome !== 'correct'}
              <dt>La tua risposta</dt>
              <dd>{labelOf(i, item.chosenOptionId)}</dd>
            {/if}
            <dt>Risposta giusta</dt>
            <dd>{labelOf(i, item.question.correctOptionId)}</dd>
          </dl>
        </li>
      {/each}
    </ol>
  </div>
</section>

<style>
  .results {
    display: grid;
    gap: 1rem;
  }

  .summary {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 1.5rem 1rem;
    text-align: center;
  }

  .summary h2:focus {
    outline: none;
  }

  .score {
    margin: 0;
    font-size: 3rem;
    line-height: 1.1;
  }

  .score strong {
    color: var(--accent);
  }

  .summary p {
    margin: 0;
  }

  .note {
    margin-top: 0.5rem !important;
    font-size: 0.875rem;
    color: var(--muted);
    max-width: 28rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .block {
    padding: 1rem;
  }

  .block:not(.card) {
    padding: 0;
  }

  h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.4rem 0;
    border-top: 1px solid var(--border);
  }

  th {
    text-align: left;
    font-weight: 500;
  }

  td {
    text-align: right;
    font-weight: 600;
    white-space: nowrap;
  }

  .review {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.6rem;
  }

  .item {
    padding: 0.75rem 1rem;
    border-left: 4px solid var(--wrong);
  }

  .item.correct {
    border-left-color: var(--correct);
  }

  .item-head {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }

  .badge {
    font-weight: 800;
    color: var(--wrong);
  }

  .item.correct .badge {
    color: var(--correct);
  }

  .thumb {
    margin: 0.5rem 0 0 1.4rem;
    width: 5rem;
  }

  .thumb :global(img),
  .thumb :global(div) {
    width: 5rem;
  }

  dl {
    margin: 0.4rem 0 0 1.4rem;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.15rem 0.75rem;
    font-size: 0.9375rem;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
</style>
