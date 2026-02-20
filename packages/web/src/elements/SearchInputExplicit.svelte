<script lang="ts">
  import keycodes from '../utility/keycodes';

  export let placeholder;
  export let value = '';
  export let altsearchbox = false;
  export let onFocusFilteredList = null;
  export let onApply = null;

  let domInput;
  let internalValue = value || '';

  $: internalValue = value || '';

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.escape) {
      internalValue = '';
      if (onApply) {
        onApply('');
      }
    }
    if (e.keyCode == keycodes.enter) {
      applyValue();
      e.preventDefault();
      return;
    }
    if (e.keyCode == keycodes.downArrow || e.keyCode == keycodes.pageDown) {
      onFocusFilteredList?.();
      e.preventDefault();
    }
  }

  function applyValue() {
    if (onApply) {
      onApply(internalValue);
    }
  }

  function handleBlur() {
    applyValue();
  }

  export function focus(text) {
    domInput.focus();
    if (text) {
      domInput.value = text;
      internalValue = text;
    }
  }
</script>

<input
  type="text"
  {placeholder}
  value={internalValue}
  on:input={e => {
    internalValue = domInput.value;
  }}
  on:keydown={handleKeyDown}
  on:blur={handleBlur}
  bind:this={domInput}
  on:focus={e => domInput.select()}
  data-testid={$$props['data-testid']}
  class:altsearchbox
  class:hasFilter={!!internalValue}
/>

<style>
  input {
    flex: 1;
    min-width: 10px;
    min-height: 22px;
    width: 10px;
    border: none;
    outline: none;
    background-color: var(--theme-searchbox-background);
  }

  input.altsearchbox {
    background-color: var(--theme-altsearchbox-background);
  }

  input::placeholder {
    color: var(--theme-searchbox-placeholder);
  }
  input.altsearchbox::placeholder {
    color: var(--theme-altsearchbox-placeholder);
  }

  input.hasFilter {
    background-color: var(--theme-searchbox-background-filtered);
  }
</style>
