<script lang="ts">
  import _, { map } from 'lodash';
  import SvelteSelect from 'svelte-select';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let options: Array<{ label: string; value: any }> = [];
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
    class="native-select {selectClass}"
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
      class={$$props['data-testid'] ? 'select-testid-' + $$props['data-testid'] : undefined}
    />
  </div>
{/if}


<style>
  .native-select {
    padding: 10px 12px;
    border: var(--theme-input-border);
    border-radius: 4px;
    background-color: var(--theme-input-background);
    color: var(--theme-input-foreground);
    font-size: 13px;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .native-select:hover {
    border-color: var(--theme-input-border-hover);
  }

  .native-select:focus {
    outline: none;
    border-color: var(--theme-input-border-focus);
    box-shadow: var(--theme-input-focus-ring);
  }

  .native-select:disabled {
    background-color: var(--theme-input-background-disabled);
    color: var(--theme-input-foreground-disabled);
    cursor: not-allowed;
    border-color: var(--theme-input-border-disabled);
  }


  .select {
    --border: var(--theme-input-border);
    --borderRadius: 4px;
    --placeholderColor: var(--theme-input-placeholder);
    --background: var(--theme-input-background);
    --listBackground: var(--theme-input-list-background);
    --itemActiveBackground: var(--theme-input-item-active-background);
    --itemIsActiveBG: var(--theme-input-item-active-background);
    --itemHoverBG: var(--theme-input-item-hover-background);
    --itemColor: var(--theme-input-item-foreground);
    --listEmptyColor: var(--theme-input-background);
    --height: 40px;
    --inputPadding: 10px 12px;
    --clearSelectWidth: 18px;
    --clearSelectPadding: 0 8px;

    --multiClearBG: var(--theme-input-multi-clear-background);
    --multiClearFill: var(--theme-input-multi-clear-foreground);
    --multiClearHoverBG: var(--theme-input-multi-clear-hover);
    --multiClearHoverFill: var(--theme-input-multi-clear-foreground);
    --multiItemActiveBG: var(--theme-input-multi-item-background);
    --multiItemActiveColor: var(--theme-input-multi-item-foreground);
    --multiItemBG: var(--theme-input-multi-item-background);
    --multiItemDisabledHoverBg: var(--theme-input-multi-item-background);
    --multiItemDisabledHoverColor: var(--theme-input-multi-item-foreground);
  }

</style>
