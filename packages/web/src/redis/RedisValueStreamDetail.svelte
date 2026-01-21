<script lang="ts">
  import { safeJsonParse } from 'dbgate-tools';
  import _ from 'lodash';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from '../forms/TextField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import JsonTree from '../jsontree/JSONTree.svelte';
  import AceEditor from '../query/AceEditor.svelte';

  export let item;
  export let onChangeItem = null;

  let display = 'text';

  $: id = item?.id || '';
  $: value = item?.value || '';
</script>

<div class="container">
  <FormFieldTemplateLarge label="ID" type="text" noMargin>
    <TextField value={id} disabled={true} />
  </FormFieldTemplateLarge>

  <div class="value-section">
    <div class="colnamewrap">
      <div class="colname">Value</div>
      <SelectField
        isNative
        value={display}
        on:change={e => {
          display = e.detail;
        }}
        options={[
          { label: 'Text', value: 'text' },
          { label: 'JSON view', value: 'json' },
        ]}
      />
    </div>
    <div class="colvalue">
      {#if display == 'text'}
        <div class="editor-wrapper">
          <AceEditor readOnly={true} {value} />
        </div>
      {/if}
      {#if display == 'json'}
        <div class="outer">
          <div class="inner">
            <JsonTree value={safeJsonParse(value) || { error: 'Not valid JSON' }} expanded />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 16px;
    flex: 1;
    overflow: auto;
    background-color: var(--theme-dbkey-background);
    border-top: var(--theme-dbkey-border);
  }

  .value-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

  .colname {
    color: var(--theme-generic-font-grayed);
  }

  .colvalue {
    position: relative;
    flex: 1;
    display: flex;
  }

  .colnamewrap {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }

  .colnamewrap :global(select) {
    padding: 2px 4px;
  }

  .outer {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .inner {
    position: absolute;
    overflow: auto;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }

  .editor-wrapper {
    position: relative;
    flex: 1;
    display: flex;
  }
</style>
