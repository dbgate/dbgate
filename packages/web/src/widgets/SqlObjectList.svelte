<script lang="ts">
  import InlineButton from '../elements/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useDatabaseInfo, useDatabaseStatus } from '../utility/metadataLoaders';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import _ from 'lodash';
  import * as databaseObjectAppObject from '../appobj/DatabaseObjectAppObject.svelte';
  import SubColumnParamList from '../appobj/SubColumnParamList.svelte';
  import { chevronExpandIcon } from '../icons/expandIcons';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  export let conid;
  export let database;

  let filter = '';

  $: objects = useDatabaseInfo({ conid, database });
  $: status = useDatabaseStatus({ conid, database });

  $: objectList = _.flatten(
    ['tables', 'views', 'procedures', 'functions'].map(objectTypeField =>
      _.sortBy(
        (($objects || {})[objectTypeField] || []).map(obj => ({ ...obj, objectTypeField })),
        ['schemaName', 'pureName']
      )
    )
  );

  const handleRefreshDatabase = () => {
    axiosInstance.post('database-connections/refresh', { conid, database });
  };
</script>

{#if $status && $status.name == 'error'}
  <WidgetsInnerContainer>
    <ErrorInfo message={$status.message} icon="img error" />
    <InlineButton on:click={handleRefreshDatabase}>Refresh</InlineButton>
  </WidgetsInnerContainer>
{:else if objectList.length == 0 && $status && $status.name != 'pending' && $objects}
  <WidgetsInnerContainer>
    <ErrorInfo
      message={`Database ${database} is empty or structure is not loaded, press Refresh button to reload structure`}
      icon="img alert"
    />
    <InlineButton on:click={handleRefreshDatabase}>Refresh</InlineButton>
  </WidgetsInnerContainer>
{:else}
  <SearchBoxWrapper>
    <SearchInput placeholder="Search tables or objects" bind:value={filter} />
    <InlineButton on:click={handleRefreshDatabase}>Refresh</InlineButton>
  </SearchBoxWrapper>
  <WidgetsInnerContainer>
    {#if ($status && $status.name == 'pending' && $objects) || !$objects}
      <LoadingInfo message="Loading database structure" />
    {:else}
      <AppObjectList
        list={objectList.map(x => ({ ...x, conid, database }))}
        module={databaseObjectAppObject}
        groupFunc={data => _.startCase(data.objectTypeField)}
        subItemsComponent={SubColumnParamList}
        isExpandable={data => data.objectTypeField == 'tables' || data.objectTypeField == 'views'}
        expandIconFunc={chevronExpandIcon}
        {filter}
      />
    {/if}
  </WidgetsInnerContainer>
{/if}
