<script lang="ts">
  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import stableStringify from 'json-stable-stringify';
  import { _t } from '../translations';

  export let title;
  export let fieldDefinitions;
  export let values;
  export let onChangeValues;
  export let pureNameTitle = null;
  export let schemaList = null;

  let collapsed = false;

  const valuesStore = writable(values || {});

  $: if (stableStringify($valuesStore) != stableStringify(values)) {
    onChangeValues($valuesStore);
  }
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
      {#if schemaList?.length > 0}
        <FormSelectField
          isNative
          name="schemaName"
          label={_t('common.schema', { defaultMessage: 'Schema' })}
          options={schemaList.map(x => ({ label: x.schemaName, value: x.schemaName }))}
        />
      {/if}
      {#if pureNameTitle}
        <FormTextField name="pureName" label={pureNameTitle} />
      {/if}
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
