<script lang="ts">
  import _, { map } from 'lodash';
  import SvelteSelect from 'svelte-select';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let options = [];
  export let value;
  export let isNative = false;
  export let isMulti = false;

  let listOpen = false;
  let isFocused = false;

  $: {
    if (!listOpen && isFocused && isMulti) listOpen = true;
  }
</script>

{#if isNative}
  <select
    {...$$restProps}
    on:change={e => {
      dispatch('change', e.target['value']);
    }}
  >
    {#each _.compact(options) as x (x.value)}
      <option value={x.value} selected={value == x.value}>
        {x.label}
      </option>
    {/each}
  </select>
{:else}
  <SvelteSelect
    {...$$restProps}
    items={options}
    selectedValue={isMulti
      ? value?.map(item => options.find(x => x.value == item))
      : options.find(x => x.value == value)}
    on:select={e => {
      if (isMulti) {
        dispatch(
          'change',
          e.detail?.map(x => x.value)
        );
      } else {
        dispatch('change', e.detail.value);
      }
    }}
    showIndicator={!isMulti}
    isClearable={isMulti}
    {isMulti}
    bind:listOpen
    bind:isFocused
  />
{/if}
