<script lang="ts">
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { useTableInfo } from '../utility/metadataLoaders';
  import TableControl from '../elements/TableControl.svelte';
  import TextField from '../forms/TextField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import {
    changeDelimitedColumnList,
    getDictionaryDescription,
    parseDelimitedColumnList,
    saveDictionaryDescription,
  } from '../utility/dictionaryDescriptionTools';
  import { includes } from 'lodash';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  export let conid;
  export let database;
  export let pureName;
  export let schemaName;
  export let onConfirm;

  $: tableInfo = useTableInfo({ conid, database, schemaName, pureName });

  $: descriptionInfo = getDictionaryDescription($tableInfo, conid, database);

  const values = writable({});

  function initValues(descriptionInfo) {
    $values = {
      columns: descriptionInfo.expression,
      delimiter: descriptionInfo.delimiter,
    };
  }

  $: if (descriptionInfo) initValues(descriptionInfo);
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Define description</svelte:fragment>

    <div class="wrapper">
      <TableControl
        rows={$tableInfo?.columns || []}
        columns={[
          { fieldName: 'checked', header: '', slot: 1 },
          { fieldName: 'columnName', header: 'Column' },
          { fieldName: 'dataType', header: 'Data type' },
        ]}
      >
        <input
          let:row
          type="checkbox"
          slot="1"
          checked={parseDelimitedColumnList($values.columns).includes(row.columnName)}
          on:change={e => {
            $values = {
              ...$values,
              columns: changeDelimitedColumnList($values.columns, row.columnName, e.target.checked),
            };
          }}
        />
      </TableControl>
    </div>

    <FormTextField name="columns" label="Show columns" />

    <FormTextField name="delimiter" label="Delimiter" />

    <FormCheckboxField name="useForAllDatabases" label="Use for all databases" />

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={() => {
          closeCurrentModal();
          saveDictionaryDescription(
            $tableInfo,
            conid,
            database,
            $values.columns,
            $values.delimiter,
            $values.useForAllDatabases
          );
          onConfirm();
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProviderCore>

<style>
  .wrapper {
    margin: var(--dim-large-form-margin);
  }
</style>
