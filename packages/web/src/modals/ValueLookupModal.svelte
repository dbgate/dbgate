<script lang="ts">
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import DefineDictionaryDescriptionModal from './DefineDictionaryDescriptionModal.svelte';
  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import { getDictionaryDescription } from '../utility/dictionaryDescriptionTools';
  import { onMount } from 'svelte';
  import { dumpSqlSelect } from 'dbgate-sqltree';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import _ from 'lodash';
  import { apiCall } from '../utility/api';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  export let onConfirm;
  export let conid;
  export let database;
  export let pureName;
  export let schemaName;
  export let field;
  export let driver;
  export let multiselect = false;
  export let jslid;
  export let formatterFunction;
  export let dataType;

  // console.log('ValueLookupModal', conid, database, pureName, schemaName, columnName, driver);

  let rows = null;
  let isLoading = false;

  let search = '';

  let checkedKeys = [];

  async function reload() {
    isLoading = true;
    if (jslid) {
      rows = await apiCall('jsldata/load-field-values', {
        jslid,
        search,
        field,
        formatterFunction,
      });
    } else {
      rows = await apiCall('database-connections/load-field-values', {
        conid,
        database,
        search,
        schemaName,
        pureName,
        field,
        dataType,
      });
    }

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
    <svelte:fragment slot="header">Choose value from {field}</svelte:fragment>

    <!-- <FormTextField name="search" label='Search' placeholder="Search" bind:value={search} /> -->
    <div class="largeFormMarker">
      <SearchInput placeholder="Search" bind:value={search} isDebounced />
    </div>

    {#if isLoading}
      <LoadingInfo message="Loading data" />
    {/if}

    {#if !isLoading && rows}
      {#if rows.errorMessage}
        <ErrorInfo message={rows.errorMessage} />
      {:else}
        <div class="tableWrapper">
          <ScrollableTableControl
            {rows}
            clickable
            on:clickrow={e => {
              const { value } = e.detail;
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
                formatter: row => (row.value == null ? '(NULL)' : row.value),
              },
            ]}
          >
            <input
              type="checkbox"
              let:row
              slot="1"
              checked={checkedKeys.includes(row['value'])}
              on:change={e => {
                const value = row['value'];
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
