<script lang="ts">
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import DefineDictionaryDescriptionModal from './DefineDictionaryDescriptionModal.svelte';
  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import { getTableInfo, useConnectionList, useUsedApps } from '../utility/metadataLoaders';
  import { getDictionaryDescription } from '../utility/dictionaryDescriptionTools';
  import { onMount } from 'svelte';
  import { dumpSqlSelect } from 'dbgate-sqltree';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import _ from 'lodash';
  import { apiCall } from '../utility/api';

  export let onConfirm;
  export let conid;
  export let database;
  export let pureName;
  export let schemaName;
  export let driver;
  export let multiselect = false;
  export let dataType;

  let rows = null;
  let tableInfo;
  let description;
  let isLoading = false;

  let search = '';

  let checkedKeys = [];

  $: apps = useUsedApps();
  $: connections = useConnectionList();

  function defineDescription() {
    showModal(DefineDictionaryDescriptionModal, {
      conid,
      database,
      schemaName,
      pureName,
      onConfirm: () => reload(),
    });
  }

  async function reload() {
    tableInfo = await getTableInfo({ conid, database, schemaName, pureName });
    description = getDictionaryDescription(tableInfo, conid, database, $apps, $connections);

    if (!tableInfo || !description) return;
    if (tableInfo?.primaryKey?.columns?.length != 1) return;

    const dmp = driver.createDumper();
    const select = {
      commandType: 'select',
      topRecords: 100,
      from: {
        name: {
          schemaName,
          pureName,
        },
      },
      columns: [
        ...tableInfo.primaryKey.columns.map(col => ({
          exprType: 'column',
          columnName: col.columnName,
        })),
        ...description.columns.map(columnName => ({
          exprType: 'column',
          columnName,
        })),
      ],
    };

    if (search) {
      const tokens = _.compact(search.split(' ').map(x => x.trim()));
      if (tokens.length > 0) {
        // @ts-ignore
        select.where = {
          conditionType: 'and',
          conditions: tokens.map(token => ({
            conditionType: 'or',
            conditions: description.columns.map(columnName => ({
              conditionType: 'like',
              left: {
                exprType: 'column',
                columnName,
              },
              right: {
                exprType: 'value',
                value: `%${token}%`,
              },
            })),
          })),
        };
      }
    }

    isLoading = true;
    const response = await apiCall('database-connections/sql-select', {
      conid,
      database,
      select
    });

    rows = response.rows;
    isLoading = false;
  }

  $: {
    search;
    $apps;
    $connections;
    reload();
  }

  onMount(() => {
    reload();
  });
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Lookup from {pureName}</svelte:fragment>

    <!-- <FormTextField name="search" label='Search' placeholder="Search" bind:value={search} /> -->
    <div class="largeFormMarker">
      <SearchInput placeholder="Search" bind:value={search} isDebounced />
    </div>

    {#if isLoading}
      <LoadingInfo message="Loading data" />
    {/if}

    {#if !isLoading && tableInfo && description && rows && tableInfo?.primaryKey?.columns?.length == 1}
      <div class="tableWrapper">
        <ScrollableTableControl
          {rows}
          clickable
          on:clickrow={e => {
            const value = e.detail[tableInfo.primaryKey.columns[0].columnName];
            if (multiselect) {
              if (checkedKeys.includes(value)) checkedKeys = checkedKeys.filter(x => x != value);
              else checkedKeys = [...checkedKeys, value];
            } else {
              closeCurrentModal();
              onConfirm(value);
            }
          }}
          columns={[
            multiselect && {
              fieldName: 'checked',
              header: '',
              width: '30px',
              slot: 1,
            },
            {
              fieldName: 'value',
              header: 'Value',
              formatter: row => row[tableInfo.primaryKey.columns[0].columnName],
              width: '100px',
            },
            {
              fieldName: 'description',
              header: 'Description',
              formatter: row => description.columns.map(col => row[col]).join(description.delimiter || ' '),
            },
          ]}
        >
          <input
            type="checkbox"
            let:row
            slot="1"
            checked={checkedKeys.includes(row[tableInfo.primaryKey.columns[0].columnName])}
            on:change={e => {
              const value = row[tableInfo.primaryKey.columns[0].columnName];
              if (e.target.checked) {
                if (!checkedKeys.includes(value)) checkedKeys = [...checkedKeys, value];
              } else {
                if (checkedKeys.includes(value)) checkedKeys = checkedKeys.filter(x => x != value);
              }
              e.stopPropagation();
            }}
          />
        </ScrollableTableControl>
      </div>
    {/if}

    <svelte:fragment slot="footer">
      {#if multiselect}
        <FormSubmit
          value="OK"
          on:click={() => {
            closeCurrentModal();
            onConfirm(checkedKeys);
          }}
        />
      {/if}
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      <FormStyledButton type="button" value="Customize" on:click={defineDescription} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .tableWrapper {
    position: relative;
    max-height: 300px;
    height: 300px;
  }
</style>
