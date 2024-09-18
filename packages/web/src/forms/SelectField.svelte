<script lang="ts">
  import _, { map } from 'lodash';
  import SvelteSelect from 'svelte-select';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let options = [];
  export let value;
  export let isNative = false;
  export let isMulti = false;
  export let notSelected = null;
  export let defaultValue = '';
  export let selectClass = '';

  let listOpen = false;
  let isFocused = false;

  $: {
    if (!listOpen && isFocused && isMulti) listOpen = true;
  }
</script>

{#if isNative}
  <select
    value={options.find(x => x.value == value) ? value : defaultValue}
    class={selectClass}
    {...$$restProps}
    on:change={e => {
      dispatch('change', e.target['value']);
    }}
  >
    {#if notSelected}
      <option value="">
        {_.isString(notSelected) ? notSelected : '(not selected)'}
      </option>
    {/if}
    {#each _.compact(options) as x (x.value)}
      <option value={x.value}>
        {x.label}
      </option>
    {/each}
  </select>
{:else}
  <div class="select">
    <SvelteSelect
      {...$$restProps}
      items={options}
      value={isMulti
        ? _.compact(value?.map(item => options.find(x => x.value == item)) ?? [])
        : (options.find(x => x.value == value) ?? null)}
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
  </div>
{/if}

<style>
  .select {
    --border: 1px solid var(--theme-border);
    --placeholderColor: var(--theme-font-2);
    --background: var(--theme-bg-0);
    --listBackground: var(--theme-bg-1);
    --itemActiveBackground: var(--theme-bg-selected);
    --itemIsActiveBG: var(--theme-bg-selected);
    --itemHoverBG: var(--theme-bg-hover);
    --itemColor: var(--theme-font-1);
    --listEmptyColor: var(--theme-bg-0);

    --multiClearBG: var(--theme-bg-3);
    --multiClearFill: var(--theme-font-2);
    --multiClearHoverBG: var(--theme-bg-hover);
    --multiClearHoverFill: var(--theme-font-hover);
    --multiItemActiveBG: var(--theme-bg-1);
    --multiItemActiveColor: var(--theme-font-1);
    --multiItemBG: var(--theme-bg-1);
    --multiItemDisabledHoverBg: var(--theme-bg-1);
    --multiItemDisabledHoverColor: var(--theme-bg-1);
  }
</style>
