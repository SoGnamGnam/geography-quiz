<script lang="ts">
  import type { Media } from '../engine'
  import { mediaUrl } from '../lib/assets'

  let { media }: { media: Media } = $props()

  let url = $derived(mediaUrl(media))

  // Alt texts must not reveal the answer.
  const ALT: Record<Media['kind'], string> = {
    flag: 'Bandiera da riconoscere',
    silhouette: 'Sagoma del paese da riconoscere',
    'coat-of-arms': 'Stemma da riconoscere',
  }
</script>

{#if url}
  {#if media.kind === 'silhouette'}
    <!-- A CSS mask lets the silhouette take the theme colour (the SVG uses currentColor). -->
    <div
      class="silhouette"
      role="img"
      aria-label={ALT[media.kind]}
      style:mask-image={`url("${url}")`}
      style:-webkit-mask-image={`url("${url}")`}
    ></div>
  {:else}
    <img class={media.kind} src={url} alt={ALT[media.kind]} />
  {/if}
{/if}

<style>
  .silhouette {
    width: min(14rem, 60vw);
    aspect-ratio: 1;
    background: var(--accent);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
  }

  .flag {
    width: min(16rem, 70vw);
    aspect-ratio: 4 / 3;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 0 0 1px var(--border);
  }

  .coat-of-arms {
    width: min(11rem, 50vw);
    aspect-ratio: 1;
    object-fit: contain;
  }
</style>
