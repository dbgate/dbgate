<script lang="ts">
  import _ from 'lodash';
  import TextField from '../forms/TextField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import DbKeyValueDetail from './DbKeyValueDetail.svelte';

  export let item;
  export let onChangeItem = null;

  $: key = item?.key || '';
  $: ttl = item?.TTL != null ? String(item.TTL) : '';

  function handleKeyChange(newKey) {
    onChangeItem?.({
      ...item,
      key: newKey,
    });
  }

  function handleTtlChange(newTtl) {
    const ttlValue = newTtl.trim() === '' ? undefined : parseInt(newTtl);
    onChangeItem?.({
      ...item,
      TTL: ttlValue,
    });
  }
</script>

<div class="container">
  <div class="top-section flex">
    <div class="field-group col-6">
      <FormFieldTemplateLarge label="Key" type="text" noMargin>
        <TextField
          value={key}
          on:input={e => handleKeyChange(e.target.value)}
          disabled={true}
        />
      </FormFieldTemplateLarge>
    </div>
    <div class="field-group col-6">
      <FormFieldTemplateLarge label="TTL" type="text" noMargin>
        <TextField
          value={ttl}
          on:input={e => handleTtlChange(e.target.value)}
          disabled={!onChangeItem}
          placeholder="Leave empty for no expiration"
        />
      </FormFieldTemplateLarge>
    </div>
  </div>

  <div class="value-section">
    <DbKeyValueDetail
      value={item?.value || ''}
      columnTitle="Value"
      onChangeValue={onChangeItem
        ? value => {
            onChangeItem?.({
              ...item,
              value: value,
            });
          }
        : null}
    />
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
  }

  .top-section {
    display: flex;
    gap: 10px;
  }
</style>
