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

  $: score = item?.score != null ? String(item.score) : '';
  $: member = item?.member || '';

  function handleScoreChange(newScore) {
    const scoreValue = newScore.trim() === '' ? undefined : parseFloat(newScore);
    onChangeItem?.({
      ...item,
      score: scoreValue,
    });
  }
</script>

<div class="container">
  <FormFieldTemplateLarge label="Score" type="text" noMargin>
    <TextField
      value={score}
      on:input={e => handleScoreChange(e.target.value)}
      disabled={!onChangeItem}
    />
  </FormFieldTemplateLarge>

  <div class="value-section">
    <div class="colnamewrap">
      <div class="colname">Member</div>
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
          <AceEditor
            readOnly={true}
            value={member}
          />
        </div>
      {/if}
      {#if display == 'json'}
        <div class="outer">
          <div class="inner">
            <JsonTree value={safeJsonParse(member) || { error: 'Not valid JSON' }} expanded />
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
    height: 100%;
    padding: 10px;
    gap: 15px;
    width: 100%;
    overflow: auto;
  }

  .value-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

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

  .editor-wrapper {
    flex: 1;
    position: relative;
    min-height: 60px;
    max-height: 1000px;
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
