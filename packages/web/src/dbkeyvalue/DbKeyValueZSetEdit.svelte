<script lang="ts">
  import _ from 'lodash';
  import TextField from '../forms/TextField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let dbKeyFields;
  export let item;
  export let onChangeItem = null;
  export let keyColumn = null;

  let records = [{ member: '', score: '' }];
  let lastItem = null;

  $: if (item !== lastItem) {
    if (item?.records && Array.isArray(item.records)) {
      records = [...item.records];
    } else if (!item) {
      records = [{ member: '', score: '' }];
    }
    lastItem = item;
  }

  $: console.log('DbKeyValueZSetEdit', { item, dbKeyFields, keyColumn, onChangeItem: !!onChangeItem });

  function getValueAsString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return JSON.stringify(value);
  }

  function handleFieldChange(index, fieldName, value) {
    records = records.map((record, idx) => (idx === index ? { ...record, [fieldName]: value } : record));

    if (onChangeItem && fieldName !== keyColumn) {
      onChangeItem?.({
        ...item,
        records: records,
      });
    }
  }

  function addRecord() {
    records = [...records, { member: '', score: '' }];
    if (onChangeItem) {
      onChangeItem({
        ...item,
        records: records,
      });
    }
  }
</script>

<div class="container">
  {#each records as record, index}
    <div class="props flex">
      <div class="field-wrapper col-8">
        <FormFieldTemplateLarge label="Member" type="text" noMargin>
          <TextField
            value={record.member}
            on:change={e => handleFieldChange(index, 'member', e.target.value)}
            disabled={keyColumn === 'member'}
          />
        </FormFieldTemplateLarge>
      </div>
      <div class="field-wrapper col-4">
        <FormFieldTemplateLarge label="Score" type="text" noMargin>
          <TextField
            value={record.score}
            on:change={e => handleFieldChange(index, 'score', e.target.value)}
            disabled={keyColumn === 'score'}
          />
        </FormFieldTemplateLarge>
      </div>
      <div class="delete-wrapper col-1">
        <button class="delete-button" on:click={() => {
            records = records.filter((_, idx) => idx !== index);
            if (onChangeItem) {
              onChangeItem({
                ...item,
                records: records,
              });
            }
          }}>
          <FontIcon icon="icon delete" />
        </button>
      </div>
    </div>
  {/each}

  <div class="add-button-wrapper">
    <button class="add-button" on:click={addRecord}>
      <FontIcon icon="icon add" />
    </button>
  </div>
</div>

<style>
  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  .props {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
    width: 100%;
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

  .add-button-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }

  .add-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--theme-generic-font-grayed);
    transition: color 0.2s;
    font-size: 24px;
  }

  .add-button:hover {
    color: var(--theme-dbkey-icon-hover);
  }
</style>
