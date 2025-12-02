<script lang="ts">
  import _ from 'lodash';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { useAllApps, useConnectionList, useTableInfo } from '../utility/metadataLoaders';
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
  } from '../utility/dictionaryDescriptionTools';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import TargetApplicationSelect from '../forms/TargetApplicationSelect.svelte';
  import { currentDatabase } from '../stores';
  import { filterAppsForDatabase } from '../utility/appTools';
  import { apiCall } from '../utility/api';
  import { _t } from '../translations';

  export let conid;
  export let database;
  export let pureName;
  export let schemaName;
  export let onConfirm;

  $: tableInfo = useTableInfo({ conid, database, schemaName, pureName });

  $: apps = useAllApps();
  $: connections = useConnectionList();

  $: descriptionInfo = getDictionaryDescription($tableInfo, conid, database, $apps, $connections, true);

  const values = writable({ targetApplication: '' } as any);

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
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">{_t('defineDictionaryDescriptionModal.header', { defaultMessage: 'Define description' })}</svelte:fragment>

    <FormSelectField
      label={_t('defineDictionaryDescriptionModal.targetApplication', { defaultMessage: 'Target application (mandatory)' })}
      name="targetApplication"
      disableInitialize
      selectFieldComponent={TargetApplicationSelect}
      {conid}
      {database}
    />

    <div class="wrapper">
      <TableControl
        rows={$tableInfo?.columns || []}
        columns={[
          { fieldName: 'checked', header: '', slot: 1 },
          { fieldName: 'columnName', header: _t('defineDictionaryDescriptionModal.column', { defaultMessage: 'Column' }) },
          { fieldName: 'dataType', header: _t('defineDictionaryDescriptionModal.dataType', { defaultMessage: 'Data type' }) },
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

    <FormTextField name="columns" label={_t('defineDictionaryDescriptionModal.showColumns', { defaultMessage: 'Show columns' })} />

    <FormTextField name="delimiter" label={_t('defineDictionaryDescriptionModal.delimiter', { defaultMessage: 'Delimiter' })} />

    <!-- <FormCheckboxField name="useForAllDatabases" label="Use for all databases" /> -->

    <svelte:fragment slot="footer">
      <FormSubmit
        value={_t('common.ok', { defaultMessage: 'OK' })}
        disabled={!checkDescriptionExpression($values?.columns, $tableInfo) || !$values.targetApplication}
        on:click={async () => {
          closeCurrentModal();

          const expression = $values.columns;
          await apiCall('apps/save-dictionary-description', {
            appid: $values.targetApplication,
            schemaName: $tableInfo.schemaName,
            pureName: $tableInfo.pureName,
            columns: parseDelimitedColumnList(expression),
            expression,
            delimiter: $values.delimiter,
          });

          // saveDictionaryDescription(
          //   $tableInfo,
          //   conid,
          //   database,
          //   $values.columns,
          //   $values.delimiter,
          //   $values.targetApplication
          // );
          onConfirm?.();
        }}
      />
      <FormStyledButton type="button" value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProviderCore>

<style>
  .wrapper {
    margin: var(--dim-large-form-margin);
  }
</style>
