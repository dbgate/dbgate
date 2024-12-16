<script lang="ts">
  import { tokenizeBySearchFilter } from 'dbgate-tools';

  export let text = '';
  export let filter = '';

  $: tokenized = filter ? tokenizeBySearchFilter(text, filter) : null;
</script>

{#if tokenized}
  {#each tokenized as token}
    {#if token.isMatch}
      <span class="highlight">{token.text}</span>
    {:else}
      {token.text}
    {/if}
  {/each}
{:else}
  {text}
{/if}

<style>
  .highlight {
    background-color: var(--theme-bg-orange);
  }
</style>
