<script lang="ts">
  import { tick } from 'svelte'
  import QuestionMedia from '../components/QuestionMedia.svelte'
  import { checkAnswer, type Answer, type Quiz } from '../engine'
  import { formatDate } from '../lib/labels'

  interface Props {
    quiz: Quiz
    onfinish: (answers: Answer[]) => void
    onquit: () => void
  }

  let { quiz, onfinish, onquit }: Props = $props()

  let index = $state(0)
  let answers = $state<Answer[]>([])
  /** undefined = not answered yet; null = skipped or out of time. */
  let chosen = $state<string | null | undefined>(undefined)
  let remainingMs = $state(0)

  let promptEl = $state<HTMLElement>()
  let nextEl = $state<HTMLButtonElement>()

  let question = $derived(quiz.questions[index]!)
  let answered = $derived(chosen !== undefined)
  let outcome = $derived(answered ? checkAnswer(question, chosen ?? null) : undefined)
  let isLast = $derived(index === quiz.questions.length - 1)
  let correctLabel = $derived(
    question.options.find((o) => o.id === question.correctOptionId)?.label,
  )

  // Timer: restarts on every question, stops once answered.
  $effect(() => {
    const limit = question.timeLimitSeconds
    if (!limit || answered) return
    const deadline = performance.now() + limit * 1000
    remainingMs = limit * 1000
    const timer = setInterval(() => {
      remainingMs = Math.max(0, deadline - performance.now())
      if (remainingMs === 0) answer(null)
    }, 100)
    return () => clearInterval(timer)
  })

  async function answer(optionId: string | null) {
    if (answered) return
    chosen = optionId
    answers.push({ questionId: question.id, optionId })
    await tick()
    nextEl?.focus()
  }

  async function next() {
    if (isLast) {
      onfinish($state.snapshot(answers))
      return
    }
    index++
    chosen = undefined
    await tick()
    promptEl?.focus()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT') return
    const n = Number(event.key)
    if (!answered && Number.isInteger(n) && n >= 1 && n <= question.options.length) {
      event.preventDefault()
      answer(question.options[n - 1]!.id)
    }
  }

  function optionState(id: string): 'correct' | 'wrong' | 'idle' {
    if (!answered) return 'idle'
    if (id === question.correctOptionId) return 'correct'
    if (id === chosen) return 'wrong'
    return 'idle'
  }

  $effect(() => {
    promptEl?.focus()
  })
</script>

<svelte:window onkeydown={onKeydown} />

<section class="play" aria-labelledby="question-prompt">
  <div class="topbar">
    <span class="progress-text">Domanda {index + 1} di {quiz.questions.length}</span>
    <button type="button" class="btn-link" onclick={onquit}>Esci</button>
  </div>
  <div
    class="progress"
    role="progressbar"
    aria-label="Avanzamento"
    aria-valuemin={0}
    aria-valuemax={quiz.questions.length}
    aria-valuenow={index + (answered ? 1 : 0)}
  >
    <div
      class="progress-fill"
      style:width={`${((index + (answered ? 1 : 0)) / quiz.questions.length) * 100}%`}
    ></div>
  </div>

  <div class="card question">
    <h2 id="question-prompt" class="prompt" tabindex="-1" bind:this={promptEl}>
      {question.prompt}
    </h2>
    {#if question.subject}
      <p class="subject">{question.subject}</p>
    {/if}
    {#if question.media}
      <div class="media"><QuestionMedia media={question.media} /></div>
    {/if}
    {#if question.snapshotDate}
      <p class="snapshot muted">Dati aggiornati al {formatDate(question.snapshotDate)}</p>
    {/if}

    {#if question.timeLimitSeconds && !answered}
      <div class="timer" aria-hidden="true">
        <div
          class="timer-fill"
          class:low={remainingMs < 5000}
          style:width={`${(remainingMs / (question.timeLimitSeconds * 1000)) * 100}%`}
        ></div>
      </div>
      <p class="visually-hidden" aria-live="off">
        Tempo: {question.timeLimitSeconds} secondi
      </p>
    {/if}
  </div>

  <ul class="options" aria-label="Risposte possibili">
    {#each question.options as option, i (option.id)}
      {@const state = optionState(option.id)}
      <li>
        <button
          type="button"
          class="option {state}"
          class:dimmed={answered && state === 'idle'}
          aria-disabled={answered}
          onclick={() => answer(option.id)}
        >
          <span class="key" aria-hidden="true">{i + 1}</span>
          <span class="option-label">{option.label}</span>
          {#if state === 'correct'}
            <span class="mark" aria-hidden="true">✓</span>
            <span class="visually-hidden">(risposta corretta)</span>
          {:else if state === 'wrong'}
            <span class="mark" aria-hidden="true">✗</span>
            <span class="visually-hidden">(la tua risposta)</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  <div class="feedback" aria-live="polite">
    {#if outcome === 'correct'}
      <p class="result correct">Esatto!</p>
    {:else if outcome === 'wrong'}
      <p class="result wrong">Sbagliato. La risposta giusta è: <strong>{correctLabel}</strong></p>
    {:else if outcome === 'skipped'}
      <p class="result wrong">
        Tempo scaduto. La risposta giusta è: <strong>{correctLabel}</strong>
      </p>
    {/if}
  </div>

  <div class="actions">
    {#if answered}
      <button type="button" class="btn btn-primary next" bind:this={nextEl} onclick={next}>
        {isLast ? 'Vedi i risultati' : 'Avanti'}
      </button>
    {:else}
      <button type="button" class="btn-link" onclick={() => answer(null)}>Salta</button>
    {/if}
  </div>
</section>

<style>
  .play {
    display: grid;
    gap: 1rem;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .progress,
  .timer {
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
  }

  .question {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 1.5rem 1rem;
    text-align: center;
  }

  .prompt {
    font-size: 1.125rem;
    font-weight: 600;
  }

  /* Focus is moved here for screen readers; the heading is not interactive. */
  .prompt:focus,
  .prompt:focus-visible {
    outline: none;
  }

  .subject {
    margin: 0;
    font-size: clamp(1.5rem, 6vw, 2.25rem);
    font-weight: 800;
    color: var(--accent);
    overflow-wrap: anywhere;
  }

  .media {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;
  }

  .snapshot {
    margin: 0;
    font-size: 0.8125rem;
  }

  .timer {
    width: 100%;
  }

  .timer-fill {
    height: 100%;
    background: var(--accent);
  }

  .timer-fill.low {
    background: var(--wrong);
  }

  .options {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.6rem;
  }

  @media (min-width: 40rem) {
    .options {
      grid-template-columns: 1fr 1fr;
    }
  }

  .option {
    width: 100%;
    height: 100%;
    min-height: 3.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 1rem;
    border: 2px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    text-align: left;
    font-weight: 500;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .option:hover:not([aria-disabled='true']) {
    border-color: var(--accent);
  }

  .option[aria-disabled='true'] {
    cursor: default;
  }

  .key {
    flex: none;
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--muted);
    font-size: 0.875rem;
    font-weight: 700;
  }

  .option-label {
    flex: 1;
    overflow-wrap: anywhere;
  }

  .mark {
    font-weight: 800;
    font-size: 1.25rem;
  }

  .option.correct {
    border-color: var(--correct);
    background: var(--correct-soft);
  }

  .option.correct .mark {
    color: var(--correct);
  }

  .option.wrong {
    border-color: var(--wrong);
    background: var(--wrong-soft);
  }

  .option.wrong .mark {
    color: var(--wrong);
  }

  .option.dimmed {
    opacity: 0.6;
  }

  .feedback {
    min-height: 1.5rem;
    text-align: center;
  }

  .result {
    margin: 0;
    font-weight: 600;
  }

  .result.correct {
    color: var(--correct);
  }

  .result.wrong {
    color: var(--wrong);
  }

  .actions {
    display: flex;
    justify-content: center;
    min-height: 3rem;
  }

  .next {
    min-width: 12rem;
  }
</style>
