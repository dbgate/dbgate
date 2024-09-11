<script lang="ts">
  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import createRef from '../utility/createRef';

  export let title;
  export let fieldDefinitions;
  export let values;
  export let onChangeValues;

  let collapsed = false;

  const valuesStore = writable(values || {});

  $: onChangeValues($valuesStore);
</script>

<div class="wrapper">
  <div class="header">
    <span
      class="collapse"
      on:click={() => {
        collapsed = !collapsed;
      }}
    >
      <FontIcon icon={collapsed ? 'icon chevron-down' : 'icon chevron-up'} />
    </span>
    <span class="title mr-1">{title}</span>
  </div>
  {#if !collapsed}
    <FormProviderCore values={valuesStore}>
      <FormArgumentList args={fieldDefinitions} />
    </FormProviderCore>
  {/if}
</div>

<style>
  .wrapper {
    margin-bottom: 20px;
    user-select: none;
  }

  .header {
    background-color: var(--theme-bg-1);
    padding: 5px;
  }

  .title {
    font-weight: bold;
    margin-left: 5px;
  }

  .body {
    margin: 20px;
  }

  .collapse {
    cursor: pointer;
  }

  .collapse:hover {
    color: var(--theme-font-hover);
    background: var(--theme-bg-3);
  }
</style>
