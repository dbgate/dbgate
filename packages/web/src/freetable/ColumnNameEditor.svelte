<script lang="ts">
  import { onMount } from 'svelte';
  import keycodes from '../utility/keycodes';

  export let onEnter;
  export let onBlur = undefined;
  export let focusOnCreate = false;
  export let blurOnEnter = false;
  export let existingNames;
  export let defaultValue = '';

  let domEditor;
  let value = defaultValue || '';
  $: isError = value && existingNames && existingNames.includes(value);

  const handleKeyDown = event => {
    if (value && event.keyCode == keycodes.enter && !isError) {
      onEnter(value);
      value = '';
      if (blurOnEnter) domEditor.blur();
    }
    if (event.keyCode == keycodes.escape) {
      value = '';
      domEditor.blur();
    }
  };
  const handleBlur = () => {
    if (value && !isError) {
      onEnter(value);
      value = '';
    }
    if (onBlur) onBlur();
  };
  if (focusOnCreate) onMount(() => domEditor.focus());
</script>

<input
  type="text"
  {...$$restProps}
  bind:value
  bind:this={domEditor}
  on:keydown={handleKeyDown}
  on:blur={handleBlur}
  class:isError
/>

<style>
  input {
    width: calc(100% - 10px);
  }

  input.isError {
    background: var(--theme-bg-red);
  }
</style>
