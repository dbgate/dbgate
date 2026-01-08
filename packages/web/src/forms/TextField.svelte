<script lang="ts">
  import { onMount } from 'svelte';

  export let value;
  export let focused = false;
  export let domEditor = undefined;
  export let autocomplete = 'new-password';

  if (focused) onMount(() => domEditor.focus());
</script>

<input
  class="text-input"
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
    height: 40px;
    box-shadow: var(--theme-input-shadow);
    width: 100%;
    box-sizing: border-box;
  }

  .text-input::placeholder {
    color: var(--theme-input-placeholder);
  }

  .text-input:hover {
    border-color: var(--theme-input-border-hover);
    box-shadow: var(--theme-input-shadow-hover);
  }

  .text-input:focus {
    outline: none;
    border-color: var(--theme-input-border-focus);
    box-shadow: var(--theme-input-focus-ring), var(--theme-input-shadow-focus);
  }

  .text-input:disabled {
    background-color: var(--theme-input-background-disabled);
    color: var(--theme-input-foreground-disabled);
    cursor: not-allowed;
    border-color: var(--theme-input-border-disabled);
    box-shadow: none;
  }
</style>
