<script lang="ts">
  import getElectron from '../utility/getElectron';

  export let href;

  const electron = getElectron();
</script>

{#if electron}
  <a on:click={() => electron.shell.openExternal(href)}>
    <slot />
  </a>
{:else}
  <a {href} target="_blank" rel="noopener noreferrer">
    <slot />
  </a>
{/if}

<style>
  a {
    text-decoration: none;
    cursor: pointer;
    color: var(--theme-font-link);
  }
  a:hover {
    text-decoration: underline;
  }
</style>
