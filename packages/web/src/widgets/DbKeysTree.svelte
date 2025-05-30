<script lang="ts">
  import {
    dbKeys_clearLoadedData,
    dbKeys_createNewModel,
    dbKeys_getFlatList,
    dbKeys_markNodeExpanded,
    dbKeys_mergeNextPage,
    findEngineDriver,
  } from 'dbgate-tools';

  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import AddDbKeyModal from '../modals/AddDbKeyModal.svelte';
  import { showModal } from '../modals/modalTools';
  import {
    activeDbKeysStore,
    currentDatabase,
    focusedConnectionOrDatabase,
    focusedTreeDbKey,
    getExtensions,
    getFocusedTreeDbKey,
  } from '../stores';
  import { apiCall } from '../utility/api';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  import DbKeysSubTree from './DbKeysSubTree.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import FocusedConnectionInfoWidget from './FocusedConnectionInfoWidget.svelte';
  import AppObjectListHandler from './AppObjectListHandler.svelte';
  import { getOpenDetailOnArrowsSettings } from '../settings/settingsTools';
  import openNewTab from '../utility/openNewTab';

  export let conid;
  export let database;
  export let treeKeySeparator = ':';

  let domListHandler;
  let domContainer = null;
  let domFilter = null;

  let filter;
  let isLoading = false;

  let model = dbKeys_createNewModel(treeKeySeparator);

  function handleAddKey() {
    const connection = $currentDatabase?.connection;
    const database = $currentDatabase?.name;
    const driver = findEngineDriver(connection, getExtensions());

    showModal(AddDbKeyModal, {
      conid: connection._id,
      database,
      driver,
      onConfirm: async item => {
        const type = driver.supportedKeyTypes.find(x => x.name == item.type);

        await apiCall('database-connections/call-method', {
          conid: connection._id,
          database,
          method: type.addMethod,
          args: [item.keyName, ...type.dbKeyFields.map(fld => item[fld.name])],
        });

        reloadModel();
      },
    });
  }

  $: differentFocusedDb =
    $focusedConnectionOrDatabase &&
    ($focusedConnectionOrDatabase.conid != conid ||
      ($focusedConnectionOrDatabase?.database && $focusedConnectionOrDatabase?.database != database));

  $: connection = useConnectionInfo({ conid });

  function changeModel(modelUpdate, loadNext) {
    if (modelUpdate) model = modelUpdate(model);
    if (loadNext) loadNextPage();
  }

  async function loadNextPage() {
    isLoading = true;
    const nextScan = await apiCall('database-connections/scan-keys', {
      conid,
      database,
      pattern: filter,
      cursor: model.cursor,
      count: model.loadCount,
    });

    model = dbKeys_mergeNextPage(model, nextScan);
    isLoading = false;
  }

  function reloadModel() {
    changeModel(model => dbKeys_clearLoadedData(model), true);
  }

  $: {
    conid;
    database;
    filter;
    reloadModel();
  }

  // $: console.log('DbKeysTree MODEL', model);
</script>

<SearchBoxWrapper noMargin>
  <SearchInput
    placeholder="Redis pattern or key part"
    bind:value={filter}
    isDebounced
    bind:this={domFilter}
    onFocusFilteredList={() => {
      domListHandler?.focusFirst();
    }}
  />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={handleAddKey} title="Add new key">
    <FontIcon icon="icon plus-thick" />
  </InlineButton>
  <InlineButton on:click={reloadModel} title="Refresh key list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
{#if !model?.loadedAll}
  <div class="space-between align-items-center ml-1">
    {#if model}
      <div>
        {#if isLoading}
          Loading...
        {:else}
          Scanned {Math.min(model?.scannedKeys, model?.dbsize) ?? '???'}/{model?.dbsize ?? '???'}
        {/if}
      </div>
    {/if}
    {#if isLoading}
      <div style="margin: 3px; margin-bottom: 2px">
        <FontIcon icon="icon loading" />
      </div>
    {:else}
      <InlineButton on:click={loadNextPage} title="Scan more keys">
        <FontIcon icon="icon more" /> Scan more
      </InlineButton>
    {/if}
  </div>
{/if}
{#if differentFocusedDb}
  <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />
{/if}
<WidgetsInnerContainer hideContent={differentFocusedDb} bind:this={domContainer}>
  <AppObjectListHandler
    bind:this={domListHandler}
    list={dbKeys_getFlatList(model)}
    selectedObjectStore={focusedTreeDbKey}
    getSelectedObject={getFocusedTreeDbKey}
    selectedObjectMatcher={(o1, o2) => o1?.key == o2?.key && o1?.type == o2?.type}
    handleObjectClick={(data, clickAction) => {
      focusedTreeDbKey.set(data);

      const openDetailOnArrows = getOpenDetailOnArrowsSettings();

      if (data.key && ((openDetailOnArrows && clickAction == 'keyArrow') || clickAction == 'keyEnter')) {
        openNewTab({
          tabComponent: 'DbKeyDetailTab',
          title: data.text || '(no name)',
          icon: 'img keydb',
          props: {
            isDefaultBrowser: true,
            conid,
            database,
          },
        });
        $activeDbKeysStore = {
          ...$activeDbKeysStore,
          [`${conid}:${database}`]: data.key,
        };
      }
      if (data.key && clickAction == 'keyEnter') {
        changeModel(model => dbKeys_markNodeExpanded(model, data.key, !model.dirsByKey[data.key]?.isExpanded), false);
      }
    }}
    handleExpansion={(data, value) => {
      changeModel(model => dbKeys_markNodeExpanded(model, data.key, value), false);
    }}
    onScrollTop={() => {
      domContainer?.scrollTop();
    }}
    onFocusFilterBox={text => {
      domFilter?.focus(text);
    }}
  >
    <DbKeysSubTree key="" {filter} {model} {changeModel} {conid} {database} {connection} />
  </AppObjectListHandler>
</WidgetsInnerContainer>
