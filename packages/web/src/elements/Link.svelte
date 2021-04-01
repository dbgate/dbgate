<script lang="ts">
  import getElectron from '../utility/getElectron';

  export let href = undefined;
  export let onClick = undefined;

  const electron = getElectron();
</script>

{#if onClick}
  <a on:click={onClick}>
    <slot />
  </a>
{:else if electron}
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
