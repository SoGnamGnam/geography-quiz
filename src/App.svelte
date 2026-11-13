<script lang="ts">
  import { generateQuiz, randomSeed, type Answer, type Quiz, type QuizData } from './engine'
  import { loadQuizData } from './lib/data'
  import { quizConfig } from './lib/settings'
  import ConfigScreen from './screens/ConfigScreen.svelte'
  import CreditsScreen from './screens/CreditsScreen.svelte'
  import PlayScreen from './screens/PlayScreen.svelte'
  import ResultsScreen from './screens/ResultsScreen.svelte'

  type Screen =
    | { name: 'config' }
    | { name: 'play'; quiz: Quiz }
    | { name: 'results'; quiz: Quiz; answers: Answer[] }
    | { name: 'credits' }

  let screen = $state<Screen>({ name: 'config' })
  let data = $state<QuizData>()
  let loadError = $state(false)

  function load() {
    loadError = false
    loadQuizData().then(
      (loaded) => (data = loaded),
      () => (loadError = true),
    )
  }
  load()

  function start() {
    if (!data) return
    screen = { name: 'play', quiz: generateQuiz(data, $quizConfig, randomSeed()) }
    window.scrollTo(0, 0)
  }

  function show(next: Screen) {
    screen = next
    window.scrollTo(0, 0)
  }
</script>

<header class="header">
  <div class="inner">
    <button type="button" class="brand" onclick={() => show({ name: 'config' })}>
      <img src="{import.meta.env.BASE_URL}icon.svg" alt="" width="28" height="28" />
      <span>World Quiz</span>
    </button>
    {#if screen.name === 'config'}
      <button type="button" class="btn-link" onclick={() => show({ name: 'credits' })}>
        Crediti
      </button>
    {/if}
  </div>
</header>

<main class="inner">
  {#if loadError}
    <div class="card error" role="alert">
      <p>Non è stato possibile caricare i dati del quiz.</p>
      <button type="button" class="btn" onclick={load}>Riprova</button>
    </div>
  {/if}

  {#if screen.name === 'config'}
    <ConfigScreen {data} onstart={start} />
  {:else if screen.name === 'play'}
    {#if screen.quiz.questions.length === 0}
      <div class="card error" role="alert">
        <p>Nessuna domanda disponibile con le impostazioni scelte.</p>
        <button type="button" class="btn" onclick={() => show({ name: 'config' })}>
          Modifica impostazioni
        </button>
      </div>
    {:else}
      {#key screen.quiz}
        <PlayScreen
          quiz={screen.quiz}
          onfinish={(answers) =>
            show({ name: 'results', quiz: (screen as { quiz: Quiz }).quiz, answers })}
          onquit={() => show({ name: 'config' })}
        />
      {/key}
    {/if}
  {:else if screen.name === 'results'}
    <ResultsScreen
      quiz={screen.quiz}
      answers={screen.answers}
      onreplay={start}
      onsettings={() => show({ name: 'config' })}
    />
  {:else}
    <CreditsScreen snapshotDate={data?.snapshotDate} onback={() => show({ name: 'config' })} />
  {/if}
</main>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }

  .inner {
    max-width: 44rem;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .header .inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 3.5rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    border: none;
    background: none;
    padding: 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 800;
  }

  main {
    padding-top: 1rem !important;
    padding-bottom: 2rem !important;
  }

  .error {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 1.5rem 1rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .error p {
    margin: 0;
  }
</style>
