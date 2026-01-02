<script lang="ts">
  import keycodes from '../utility/keycodes';
  import _ from 'lodash';

  export let placeholder;
  export let value;
  export let altsearchbox = false;

  $: searchValue = value || '';
  export let isDebounced = false;
  export let onFocusFilteredList = null;
  export let onChange = null;

  let domInput;

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.escape) {
      if (onChange) {
        onChange('');
      } else {
        value = '';
      }
    }
    if (e.keyCode == keycodes.downArrow || e.keyCode == keycodes.pageDown || e.keyCode == keycodes.enter) {
      onFocusFilteredList?.();
      e.preventDefault();
    }
  }

  const debouncedSet = _.debounce(x => (value = x), 500);

  export function focus(text) {
    domInput.focus();
    if (text) {
      domInput.value = text;
      if (onChange) {
        onChange(text);
      } else {
        value = text;
      }
    }
  }
</script>

<input
  type="text"
  {placeholder}
  value={searchValue}
  on:input={e => {
    if (onChange) {
      onChange(domInput.value);
    } else {
      if (isDebounced) debouncedSet(domInput.value);
      else value = domInput.value;
    }
  }}
  on:keydown={handleKeyDown}
  bind:this={domInput}
  on:focus={e => domInput.select()}
  data-testid={$$props['data-testid']}
  class:altsearchbox
  class:hasFilter={!!value}
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
