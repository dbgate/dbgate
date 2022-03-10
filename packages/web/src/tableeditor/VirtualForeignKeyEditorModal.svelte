<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import { fullNameFromString, fullNameToLabel, fullNameToString } from 'dbgate-tools';
  import SelectField from '../forms/SelectField.svelte';
  import _ from 'lodash';
  import { useDatabaseInfo, useTableInfo } from '../utility/metadataLoaders';
  import { onMount, tick } from 'svelte';
  import TargetApplicationSelect from '../forms/TargetApplicationSelect.svelte';
  import { apiCall } from '../utility/api';
  import { saveDbToApp } from '../utility/appTools';

  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let columnName;

  let dstApp;

  const dbInfo = useDatabaseInfo({ conid, database });
  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });

  let columns = [];
  let refTableName = null;
  let refSchemaName = null;

  $: tableList = [
    ..._.sortBy($dbInfo?.tables || [], ['schemaName', 'pureName']),
    // ..._.sortBy($dbInfo?.views || [], ['schemaName', 'pureName']),
  ];

  let tableOptions = [];

  $: (async () => {
    // without this has svelte problem, doesn't invalidate SelectField options
    await tick();
    // to replicate try to invoke VFK editor after page refresh, when active widget without DB, eg. application layers
    // and comment line above. Tables list in vFK editor will be empty

    tableOptions = tableList.map(tbl => ({
      label: fullNameToLabel(tbl),
      value: fullNameToString(tbl),
    }));
  })();
  $: refTableInfo = tableList.find(x => x.pureName == refTableName && x.schemaName == refSchemaName);
  // $dbInfo?.views?.find(x => x.pureName == refTableName && x.schemaName == refSchemaName);

  onMount(() => {
    if (columnName) {
      columns = [
        ...columns,
        {
          columnName,
        },
      ];
    }
  });

  // $: console.log('conid, database', conid, database);
  // $: console.log('$dbInfo?.tables', $dbInfo?.tables);
  // $: console.log('tableList', tableList);
  // $: console.log('tableOptions', tableOptions);
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Virtual foreign key</svelte:fragment>

    <div class="largeFormMarker">
      <div class="row">
        <div class="label col-3">Referenced table</div>
        <div class="col-9">
          <SelectField
            value={fullNameToString({ pureName: refTableName, schemaName: refSchemaName })}
            isNative
            notSelected
            options={tableOptions}
            on:change={e => {
              if (e.detail) {
                const name = fullNameFromString(e.detail);
                refTableName = name.pureName;
                refSchemaName = name.schemaName;
                if (columns?.length == 1) {
                  const table = $dbInfo?.tables?.find(x => x.pureName == refTableName && x.schemaName == refSchemaName);
                  if (table?.primaryKey?.columns?.length == 1) {
                    columns = [
                      {
                        ...columns[0],
                        refColumnName: table.primaryKey.columns[0].columnName,
                      },
                    ];
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="col-5 mr-1">
          Base column - {$tableInfo?.pureName}
        </div>
        <div class="col-5 ml-1">
          Ref column - {refTableName || '(table not set)'}
        </div>
      </div>

      {#each columns as column, index}
        <div class="row">
          <div class="col-5 mr-1">
            {#key column.columnName}
              <SelectField
                value={column.columnName}
                isNative
                notSelected
                options={($tableInfo?.columns || []).map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                }))}
                on:change={e => {
                  if (e.detail) {
                    columns = columns.map((col, i) => (i == index ? { ...col, columnName: e.detail } : col));
                  }
                }}
              />
            {/key}
          </div>
          <div class="col-5 ml-1">
            {#key column.refColumnName}
              <SelectField
                value={column.refColumnName}
                isNative
                notSelected
                options={(refTableInfo?.columns || []).map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                }))}
                on:change={e => {
                  if (e.detail) {
                    columns = columns.map((col, i) => (i == index ? { ...col, refColumnName: e.detail } : col));
                  }
                }}
              />
            {/key}
          </div>
          <div class="col-2 button">
            <FormStyledButton
              value="Delete"
              on:click={e => {
                const x = [...columns];
                x.splice(index, 1);
                columns = x;
              }}
            />
          </div>
        </div>
      {/each}

      <FormStyledButton
        type="button"
        value="Add column"
        on:click={() => {
          columns = [...columns, {}];
        }}
      />

      <div class="row">
        <div class="label col-3">Target application</div>
        <div class="col-9">
          <TargetApplicationSelect bind:value={dstApp} />
        </div>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit
        value={'Save'}
        on:click={async () => {
          const appFolder = await saveDbToApp(conid, database, dstApp);
          await apiCall('apps/save-virtual-reference', {
            appFolder,
            schemaName,
            pureName,
            refSchemaName,
            refTableName,
            columns,
          });
          closeCurrentModal();
        }}
      />

      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }

  .row .label {
    white-space: nowrap;
    align-self: center;
  }

  .button {
    align-self: center;
    text-align: right;
  }
</style>
