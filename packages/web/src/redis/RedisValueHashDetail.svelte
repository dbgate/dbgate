<script lang="ts">
  import _ from 'lodash';
  import TextField from '../forms/TextField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import RedisValueDetail from './RedisValueDetail.svelte';

  export let item;
  export let onChangeItem = null;

  $: key = item?.key || '';
  $: ttl = item?.ttl != null ? String(item.ttl) : '';

  function handleKeyChange(newKey) {
    onChangeItem?.({
      ...item,
      key: newKey,
    });
  }

  function handleTtlChange(newTtl) {
    const ttlValue = newTtl.trim() ? newTtl : undefined;
    onChangeItem?.({
      ...item,
      ttl: ttlValue,
    });
  }
</script>

<div class="container">
  <div class="top-section flex">
    <div class="field-group col-6">
      <FormFieldTemplateLarge label="Key" type="text" noMargin>
        <TextField
          value={key}
          on:input={e => {
            if (e.target.value != key) {
              handleKeyChange(e.target.value);
            }
          }}
          disabled={true}
        />
      </FormFieldTemplateLarge>
    </div>
    <div class="field-group col-6">
      <FormFieldTemplateLarge label="TTL" type="text" noMargin>
        {#key key}
          <TextField
            value={ttl}
            on:input={e => {
              if (e.target.value != ttl) {
                handleTtlChange(e.target.value);
              }
            }}
            disabled={!onChangeItem}
            placeholder="Leave empty for no expiration"
          />
        {/key}
      </FormFieldTemplateLarge>
    </div>
  </div>

  <div class="value-section">
    {#key key}
      <RedisValueDetail
        value={item?.value || ''}
        columnTitle="Value"
        onChangeValue={onChangeItem
          ? value => {
              if (value != item?.value) {
                onChangeItem?.({
                  ...item,
                  value: value,
                });
              }
            }
          : null}
      />
    {/key}
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 16px;
    width: 100%;
    overflow: auto;
    background-color: var(--theme-dbkey-background);
    border-top: var(--theme-dbkey-border);
  }

  .value-section {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .top-section {
    display: flex;
    gap: 16px;
  }
</style>
