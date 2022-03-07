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

  export let conid;
  export let database;
  export let key;
  export let isDefaultBrowser = false;

  export const activator = createActivator('DbKeyDetailTab', true);

  $: key = $activeDbKeysStore[`${conid}:${database}`];
  let refreshToken = 0;
</script>

{#await apiCall('database-connections/load-key-info', { conid, database, key, refreshToken })}
  <LoadingInfo message="Loading key details" wrapper />
{:then keyInfo}
  <div class="container">
    <div class="top-panel">
      <FontIcon icon={getIconForRedisType(keyInfo.type)} padRight />
      <div class="type">
        {keyInfo.type}
      </div>
      <TextField value={key} readOnly />
      {key}
      TTL:{keyInfo.ttl}
      <FormStyledButton
        value="Refresh"
        on:click={() => {
          refreshToken += 1;
        }}
      />
    </div>

    <div class="content">
      {#if keyInfo.tableColumns}
        <VerticalSplitter>
          <svelte:fragment slot="1">
            <DbKeyTableControl {conid} {database} {keyInfo} />
          </svelte:fragment>
          <svelte:fragment slot="2">PROPS</svelte:fragment>
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
  }

  .type {
    font-weight: bold;
  }
</style>
