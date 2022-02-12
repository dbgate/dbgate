<script lang="ts">
  import FormProvider from '../forms/FormProvider.svelte';
  import _ from 'lodash';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { useAppFolders, useConnectionList, useTableInfo, useUsedApps } from '../utility/metadataLoaders';
  import TableControl from '../elements/TableControl.svelte';
  import TextField from '../forms/TextField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import {
    changeDelimitedColumnList,
    checkDescriptionExpression,
    getDictionaryDescription,
    parseDelimitedColumnList,
    saveDictionaryDescription,
  } from '../utility/dictionaryDescriptionTools';
  import { includes } from 'lodash';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import TargetApplicationSelect from '../forms/TargetApplicationSelect.svelte';
  import { currentDatabase } from '../stores';
  import { filterAppsForDatabase } from '../utility/appTools';

  export let conid;
  export let database;
  export let pureName;
  export let schemaName;
  export let onConfirm;

  $: tableInfo = useTableInfo({ conid, database, schemaName, pureName });

  $: apps = useUsedApps();
  $: appFolders = useAppFolders();
  $: connections = useConnectionList();

  $: descriptionInfo = getDictionaryDescription($tableInfo, conid, database, $apps, $connections, true);

  const values = writable({ targetApplication: '#new' } as any);

  function initValues(descriptionInfo) {
    $values = {
      targetApplication: $values.targetApplication,
      columns: descriptionInfo.expression,
      delimiter: descriptionInfo.delimiter,
    };
  }

  $: {
    if (descriptionInfo) initValues(descriptionInfo);
  }

  $: {
    if ($values.targetApplication == '#new' && $currentDatabase) {
      const filtered = filterAppsForDatabase($currentDatabase.connection, $currentDatabase.name, $apps || []);
      const common = _.intersection(
        ($appFolders || []).map(x => x.name),
        filtered.map(x => x.name)
      );
      if (common.length > 0) {
        $values = {
          ...$values,
          targetApplication: common[0],
        };
      }
    }
  }
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
          disabled={$tableInfo?.primaryKey?.columns?.find(x => x.columnName == row.columnName)}
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

    <FormSelectField
      label="Target application"
      name="targetApplication"
      disableInitialize
      selectFieldComponent={TargetApplicationSelect}
    />

    <!-- <FormCheckboxField name="useForAllDatabases" label="Use for all databases" /> -->

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        disabled={!checkDescriptionExpression($values?.columns, $tableInfo)}
        on:click={() => {
          closeCurrentModal();
          saveDictionaryDescription(
            $tableInfo,
            conid,
            database,
            $values.columns,
            $values.delimiter,
            $values.targetApplication
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
