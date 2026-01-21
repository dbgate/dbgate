<script lang="ts">
  import _ from 'lodash';
  import TextField from '../forms/TextField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { findSupportedRedisKeyType } from 'dbgate-tools';

  export let records;
  export let onChangeRecords;
  export let keyColumn = null;
  export let type = 'list';

  $: keyType = findSupportedRedisKeyType(type);

  function handleFieldChange(index, fieldName, value) {
    const newRecords = records.map((record, idx) => (idx === index ? { ...record, [fieldName]: value } : record));
    onChangeRecords?.(newRecords);
  }
</script>

<div class="container">
  {#each records as record, index}
    <div class="props-and-button">
      <div class="col-11 props-line">
        {#each keyType?.dbKeyFields ?? [] as field}
          <div class="field-wrapper col-{field.cols}">
            <FormFieldTemplateLarge label={field.label ?? _.startCase(field.name)} type="text" noMargin>
              <TextField
                value={record[field.name]}
                placeholder={field.placeholder ?? ''}
                on:input={e => {
                  if (e.target['value'] != record[field.name]) {
                    handleFieldChange(index, field.name, e.target['value']);
                  }
                }}
                disabled={keyColumn === field.name}
              />
            </FormFieldTemplateLarge>
          </div>
        {/each}
      </div>
      <div class="delete-wrapper col-1">
        <button
          class="delete-button"
          on:click={() => {
            const newRecords = records.filter((_, idx) => idx !== index);
            onChangeRecords?.(newRecords);
          }}
        >
          <FontIcon icon="icon delete" />
        </button>
      </div>
    </div>
  {/each}
</div>

<style>
  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  .props-and-button {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
    width: 100%;
  }

  .props-line {
    display: flex;
    flex: 1;
    gap: 8px;
  }

  .field-wrapper {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .delete-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--theme-generic-font-grayed);
    transition: color 0.2s;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 20px;
  }

  .delete-button:hover {
    color: var(--theme-dbkey-icon-hover);
  }
</style>
