<script lang="ts">
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import DefineDictionaryDescriptionModal from './DefineDictionaryDescriptionModal.svelte';
  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import { getDictionaryDescription } from '../utility/dictionaryDescriptionTools';
  import { onMount } from 'svelte';
  import { dumpSqlSelect } from 'dbgate-sqltree';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import _ from 'lodash';

  export let onConfirm;
  export let conid;
  export let database;
  export let pureName;
  export let schemaName;
  export let columnName;
  export let driver;
  export let multiselect = false;

  // console.log('ValueLookupModal', conid, database, pureName, schemaName, columnName, driver);

  let rows = null;
  let isLoading = false;

  let search = '';

  let checkedKeys = [];

  async function reload() {
      const dmp = driver.createDumper();
    const select = {
      commandType: 'select',
      distinct: true,
      topRecords: 100,

      from: {
        name: {
          schemaName,
          pureName,
        },
      },
      columns: [
        {
          exprType: 'column',
          columnName,
        },
      ],
      orderBy: [
        {
          exprType: 'column',
          columnName,
        },
      ],
    };

    if (search) {
      const tokens = _.compact(search.split(' ').map(x => x.trim()));
      if (tokens.length > 0) {
        // @ts-ignore
        select.where = {
          conditionType: 'and',
          conditions: tokens.map(token => ({
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
        };
      }
    }

    // @ts-ignore
    dumpSqlSelect(dmp, select);

    isLoading = true;
    const response = await axiosInstance().request({
      url: 'database-connections/query-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { sql: dmp.s },
    });

    rows = response.data.rows;
    isLoading = false;
  }

  $: {
    search;
    reload();
  }

  onMount(() => {
    reload();
  });
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Choose value from {columnName}</svelte:fragment>

    <!-- <FormTextField name="search" label='Search' placeholder="Search" bind:value={search} /> -->
    <div class="largeFormMarker">
      <SearchInput placeholder="Search" bind:value={search} isDebounced />
    </div>

    {#if isLoading}
      <LoadingInfo message="Loading data" />
    {/if}

    {#if !isLoading && rows}
      <div class="tableWrapper">
        <ScrollableTableControl
          {rows}
          clickable
          on:clickrow={e => {
            const value = e.detail[columnName];
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
              formatter: row => (row[columnName] == null ? '(NULL)' : row[columnName]),
            },
          ]}
        >
          <input
            type="checkbox"
            let:row
            slot="1"
            checked={checkedKeys.includes(row[columnName])}
            on:change={e => {
              const value = row[columnName];
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
