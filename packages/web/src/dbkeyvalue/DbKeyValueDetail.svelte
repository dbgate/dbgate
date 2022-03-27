<script lang="ts">
  import { safeJsonParse } from 'dbgate-tools';

  import _ from 'lodash';
  import SelectField from '../forms/SelectField.svelte';
  import JsonTree from '../jsontree/JSONTree.svelte';

  import AceEditor from '../query/AceEditor.svelte';

  let display = 'text';

  export let column;
  export let item;
  export let onChangeItem = null;
</script>

<div class="colnamewrap">
  <div class="colname">{_.startCase(column.name)}</div>
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
    <AceEditor
      readOnly={!onChangeItem}
      value={item && item[column.name]}
      on:input={e => {
        if (onChangeItem) {
          onChangeItem({
            ...item,
            [column.name]: e.detail,
          });
        }
      }}
    />
  {/if}
  {#if display == 'json'}
    <div class="outer">
      <div class="inner">
        <JsonTree value={safeJsonParse(item[column.name]) || { error: 'Not valid JSON' }} expanded />
      </div>
    </div>
  {/if}
</div>

<style>
  .colname {
    color: var(--theme-font-3);
  }

  .colvalue {
    position: relative;
    flex: 1;
    display: flex;
  }

  .colnamewrap {
    display: flex;
    margin: 20px 5px 5px 5px;
    justify-content: space-between;
  }

  .outer {
    flex: 1;
    position: relative;
  }
  .inner {
    overflow: scroll;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
</style>
