<script lang="ts">
  import { loadCoatOfArmsAttributions } from '../lib/data'
  import { formatDate } from '../lib/labels'

  let { snapshotDate, onback }: { snapshotDate: string | undefined; onback: () => void } = $props()

  const attributions = loadCoatOfArmsAttributions()

  let headingEl = $state<HTMLElement>()
  $effect(() => {
    headingEl?.focus()
  })
</script>

<section class="credits" aria-labelledby="credits-title">
  <div class="topbar">
    <h2 id="credits-title" tabindex="-1" bind:this={headingEl}>Informazioni e crediti</h2>
    <button type="button" class="btn-link" onclick={onback}>Indietro</button>
  </div>

  <div class="card block">
    <h3>World Quiz</h3>
    <p>
      Quiz di geografia libero e senza pubblicità. Funziona offline e non raccoglie alcun dato
      personale: niente account, niente statistiche, nessuna connessione durante il gioco. L'unica
      cosa salvata sono le tue impostazioni, nel browser.
    </p>
    <p>Il codice è distribuito con licenza GPL-3.0, i dati generati con licenza CC0.</p>
  </div>

  <div class="card block">
    <h3>Fonti dei dati</h3>
    <ul>
      <li>
        <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer">Wikidata</a>
        (CC0): nomi, capitali, leader, popolazione, superficie e gli altri dati sui paesi.
        {#if snapshotDate}Dati aggiornati al {formatDate(snapshotDate)}.{/if}
      </li>
      <li>
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer"
          >Natural Earth</a
        > (pubblico dominio): confini usati per le sagome dei paesi.
      </li>
      <li>
        <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noopener noreferrer"
          >flag-icons</a
        > (MIT): bandiere.
      </li>
      <li>
        <a href="https://rsms.me/inter/" target="_blank" rel="noopener noreferrer">Inter</a> (SIL Open
        Font License): carattere tipografico.
      </li>
    </ul>
  </div>

  <div class="card block">
    <h3>Stemmi</h3>
    <p class="muted">
      Da <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer"
        >Wikimedia Commons</a
      >, mostrati ridimensionati. Autore e licenza di ciascun file:
    </p>
    {#await attributions}
      <p class="muted">Caricamento…</p>
    {:then list}
      <ul class="attributions">
        {#each list as a (a.id)}
          <li>
            <strong>{a.name}</strong>:
            <a href={a.descriptionUrl} target="_blank" rel="noopener noreferrer">{a.file}</a
            >{#if a.artist}, {a.artist}{/if}
            —
            {#if a.licenseUrl}
              <a href={a.licenseUrl} target="_blank" rel="noopener noreferrer">{a.license}</a>
            {:else}
              {a.license}
            {/if}
          </li>
        {/each}
      </ul>
    {:catch}
      <p class="muted">Elenco non disponibile.</p>
    {/await}
  </div>
</section>

<style>
  .credits {
    display: grid;
    gap: 1rem;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .topbar h2 {
    font-size: 1.25rem;
  }

  .topbar h2:focus {
    outline: none;
  }

  .block {
    padding: 1rem;
  }

  h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  p {
    margin: 0 0 0.5rem;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
    display: grid;
    gap: 0.4rem;
  }

  .attributions {
    font-size: 0.875rem;
    overflow-wrap: anywhere;
  }
</style>
