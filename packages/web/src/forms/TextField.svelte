<script lang="ts">
  import { onMount } from 'svelte';

  export let value;
  export let focused = false;
  export let domEditor = undefined;
  export let autocomplete = 'new-password';
  export let isTextArea = false;

  if (focused) onMount(() => domEditor.focus());
</script>

{#if isTextArea}
  <textarea
    class="text-input"
    {...$$restProps}
    bind:value
    on:change
    on:input
    on:click
    bind:this={domEditor}
    on:keydown
    {autocomplete}
  ></textarea>
{:else}
  <input
    class="text-input text-input-one-line"
    type="text"
    {...$$restProps}
    bind:value
    on:change
    on:input
    on:click
    bind:this={domEditor}
    on:keydown
    {autocomplete}
  />
{/if}

<style>
  .text-input {
    padding: 10px 12px;
    border: var(--theme-input-border);
    border-radius: 4px;
    background-color: var(--theme-input-background);
    color: var(--theme-input-foreground);
    font-size: 13px;
    transition: all 0.15s ease;
    font-family: inherit;
    box-shadow: var(--theme-input-shadow);
    width: 100%;
    box-sizing: border-box;
  }
  .text-input-one-line {
    height: 40px;
  }

  .text-input::placeholder {
    color: var(--theme-input-placeholder);
  }

  .text-input:hover {
    border: var(--theme-input-border-hover);
    box-shadow: var(--theme-input-shadow-hover);
  }

  .text-input:focus {
    outline: none;
    border: var(--theme-input-border-focus);
    box-shadow: var(--theme-input-focus-ring), var(--theme-input-shadow-focus);
  }

  .text-input:disabled {
    background-color: var(--theme-input-background-disabled);
    color: var(--theme-input-foreground-disabled);
    cursor: not-allowed;
    border: var(--theme-input-border-disabled);
    box-shadow: none;
  }
</style>
