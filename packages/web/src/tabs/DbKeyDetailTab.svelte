<script lang="ts" context="module">
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  const getCurrentEditor = () => getActiveComponent('DbKeyDetailTab');

  export const matchingProps = ['conid', 'database', 'isDefaultBrowser'];
  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import { activeDbKeysStore } from '../stores';
  import { apiCall } from '../utility/api';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { getIconForRedisType } from 'dbgate-tools';
  import TextField from '../forms/TextField.svelte';
  import DbKeyTableControl from '../datagrid/DbKeyTableControl.svelte';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import _ from 'lodash';

  export let conid;
  export let database;
  export let key;
  export let isDefaultBrowser = false;

  export const activator = createActivator('DbKeyDetailTab', true);

  let currentRow;

  $: key = $activeDbKeysStore[`${conid}:${database}`];
  let refreshToken = 0;

  function handleChangeTtl(keyInfo) {
    showModal(InputTextModal, {
      value: keyInfo.ttl,
      label: 'New TTL value (-1=key never expires)',
      header: `Set TTL for key ${keyInfo.key}`,
      onConfirm: async value => {
        const ttl = parseInt(value);
        if (_.isNumber(ttl)) {
          if (ttl < 0) {
            await apiCall('database-connections/call-method', {
              conid,
              database,
              method: 'persist',
              args: [keyInfo.key],
            });
          } else {
            await apiCall('database-connections/call-method', {
              conid,
              database,
              method: 'expire',
              args: [keyInfo.key, ttl],
            });
          }
          refresh();
        }
      },
    });
  }

  function refresh() {
    refreshToken += 1;
  }
</script>

{#await apiCall('database-connections/load-key-info', { conid, database, key, refreshToken })}
  <LoadingInfo message="Loading key details" wrapper />
{:then keyInfo}
  <div class="container">
    <div class="top-panel">
      <div class="type">
        <FontIcon icon={getIconForRedisType(keyInfo.type)} padRight />
        {keyInfo.type}
      </div>
      <div class="key-name">
        <TextField value={key} readOnly />
      </div>
      <FormStyledButton value={`TTL:${keyInfo.ttl}`} on:click={() => handleChangeTtl(keyInfo)} />
      <FormStyledButton value="Refresh" on:click={refresh} />
    </div>

    <div class="content">
      {#if keyInfo.tableColumns}
        <VerticalSplitter>
          <svelte:fragment slot="1">
            <DbKeyTableControl
              {conid}
              {database}
              {keyInfo}
              onChangeSelected={row => {
                currentRow = row;
              }}
            />
          </svelte:fragment>
          <div slot="2" class="props">
            {#each keyInfo.tableColumns as column}
              <div class="colname">{column.name}</div>
              <div class="colvalue">
                <AceEditor readOnly value={currentRow && currentRow[column.name]} />
              </div>
            {/each}
          </div>
        </VerticalSplitter>
      {:else}
        <AceEditor readOnly value={keyInfo.value} />
      {/if}
    </div>
  </div>
{/await}

<style>
  .container {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .content {
    flex: 1;
    position: relative;
  }

  .top-panel {
    display: flex;
    background: var(--theme-bg-2);
  }

  .type {
    font-weight: bold;
    margin-right: 10px;
    align-self: center;
  }

  .props {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .colname {
    margin: 10px;
  }

  .colvalue {
    position: relative;
    flex: 1;
  }

  .key-name {
    flex-grow: 1;
    display: flex;
  }

  .key-name :global(input) {
    flex-grow: 1;
  }
</style>
