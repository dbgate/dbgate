<script lang="ts">
  import { handleUntrustedHtmlClick, sanitizeUntrustedHtml } from '../utility/sanitizeHtml';

  export let html;
  // Keeps inline styles (e.g. for a preview of HTML stored in the database). The HTML is then
  // rendered in a confined box: contain: paint makes it the containing block even for
  // position: fixed elements and clips them, so styled content cannot cover the application UI.
  export let allowStyles = false;

  $: sanitizedHtml = sanitizeUntrustedHtml(html, { allowStyles });
</script>

{#if allowStyles}
  <div class="confined" on:click={handleUntrustedHtmlClick}>{@html sanitizedHtml}</div>
{:else}
  <span class="wrapper" on:click={handleUntrustedHtmlClick}>{@html sanitizedHtml}</span>
{/if}

<style>
  .wrapper {
    display: contents;
  }
  .confined {
    position: relative;
    overflow: hidden;
    contain: paint;
    isolation: isolate;
  }
</style>
