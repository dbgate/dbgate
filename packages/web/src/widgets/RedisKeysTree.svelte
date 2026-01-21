<script lang="ts">
  import {
    redis_clearLoadedData,
    redis_createNewModel,
    redis_getFlatList,
    redis_markNodeExpanded,
    redis_mergeNextPage,
    supportedRedisKeyTypes,
  } from 'dbgate-tools';

  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { showModal } from '../modals/modalTools';
  import {
    activeRedisKeysStore,
    currentDatabase,
    focusedConnectionOrDatabase,
    focusedTreeRedisKey,
    getExtensions,
    getFocusedTreeRedisKey,
  } from '../stores';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  import RedisKeysSubTree from './RedisKeysSubTree.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import FocusedConnectionInfoWidget from './FocusedConnectionInfoWidget.svelte';
  import AppObjectListHandler from './AppObjectListHandler.svelte';
  import { getOpenDetailOnArrowsSettings } from '../settings/settingsTools';
  import openNewTab from '../utility/openNewTab';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { onDestroy, onMount } from 'svelte';
  import DropDownButton from '../buttons/DropDownButton.svelte';

  export let conid;
  export let database;
  export let treeKeySeparator = ':';

  let domListHandler;
  let domContainer = null;
  let domFilter = null;

  let filter;
  let isLoading = false;

  let model = redis_createNewModel(treeKeySeparator);

  function handleAddKey(initialKeyType) {
    const connection = $currentDatabase?.connection;
    const database = $currentDatabase?.name;
    const focusedKey = $focusedTreeRedisKey;

    let initialKeyName = '';
    if (focusedKey) {
      if (focusedKey.type === 'dir' && focusedKey.key) {
        initialKeyName = focusedKey.key + treeKeySeparator;
      } else if (focusedKey.key) {
        const lastSeparatorIndex = focusedKey.key.lastIndexOf(treeKeySeparator);
        if (lastSeparatorIndex !== -1) {
          initialKeyName = focusedKey.key.substring(0, lastSeparatorIndex + 1);
        }
      }
    }

    openNewTab({
      tabComponent: 'NewRedisKeyTab',
      title: 'Add key',
      icon: 'img keydb',
      props: {
        conid: connection?._id,
        database,
        initialKeyName,
        initialKeyType,
      },
    });
  }

  function createAddKeyMenu() {
    return supportedRedisKeyTypes.map(type => ({
      label: type.label,
      onClick: () => {
        handleAddKey(type.name);
      },
    }));
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

  async function loadNextPage(skipCount = false) {
    isLoading = true;
    const nextScan = await apiCall('database-connections/scan-keys', {
      conid,
      database,
      pattern: filter,
      cursor: model.cursor,
      count: skipCount ? undefined : model.loadCount,
    });

    model = redis_mergeNextPage(model, nextScan);
    isLoading = false;
  }

  async function loadAll() {
    showModal(ConfirmModal, {
      message:
        'This will scan all keys in the database, which could affect server performance. Do you want to continue?',
      onConfirm: () => {
        loadNextPage(true);
      },
    });
  }

  function reloadModel() {
    changeModel(model => redis_clearLoadedData(model), true);
  }

  onMount(() => {
    apiOn(`redis-keys-changed-${conid}-${database}`, reloadModel);
  });
  onDestroy(() => {
    apiOff(`redis-keys-changed-${conid}-${database}`, reloadModel);
  });

  $: {
    conid;
    database;
    filter;
    reloadModel();
  }

  // $: console.log('DbKeysTree MODEL', model);
</script>

<SearchBoxWrapper noMargin {filter}>
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
  <DropDownButton
    icon="icon plus-thick"
    menu={createAddKeyMenu}
    narrow={false}
    data-testid="RedisKeysTree_addKeyDropdown"
    title="Add new key"
  />
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
      <div class="flex">
        <InlineButton on:click={() => loadNextPage()} title="Scan more keys">
          <FontIcon icon="icon more" /> Scan more
        </InlineButton>
        <InlineButton on:click={() => loadAll()} title="Scan all keys">
          <FontIcon icon="icon warn" /> Scan all
        </InlineButton>
      </div>
    {/if}
  </div>
{/if}
{#if differentFocusedDb}
  <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />
{/if}
<WidgetsInnerContainer hideContent={differentFocusedDb} bind:this={domContainer}>
  <AppObjectListHandler
    bind:this={domListHandler}
    list={redis_getFlatList(model)}
    selectedObjectStore={focusedTreeRedisKey}
    getSelectedObject={getFocusedTreeRedisKey}
    selectedObjectMatcher={(o1, o2) => o1?.key == o2?.key && o1?.type == o2?.type}
    handleObjectClick={(data, clickAction) => {
      focusedTreeRedisKey.set(data);

      const openDetailOnArrows = getOpenDetailOnArrowsSettings();

      if (data.key && ((openDetailOnArrows && clickAction == 'keyArrow') || clickAction == 'keyEnter')) {
        openNewTab({
          tabComponent: 'RedisKeyDetailTab',
          title: data.text || '(no name)',
          icon: 'img keydb',
          props: {
            isDefaultBrowser: true,
            conid,
            database,
          },
        });
        $activeRedisKeysStore = {
          ...$activeRedisKeysStore,
          [`${conid}:${database}`]: data.key,
        };
      }
      if (data.key && clickAction == 'keyEnter') {
        changeModel(model => redis_markNodeExpanded(model, data.key, !model.dirsByKey[data.key]?.isExpanded), false);
      }
    }}
    handleExpansion={(data, value) => {
      changeModel(model => redis_markNodeExpanded(model, data.key, value), false);
    }}
    onScrollTop={() => {
      domContainer?.scrollTop();
    }}
    onFocusFilterBox={text => {
      domFilter?.focus(text);
    }}
  >
    <RedisKeysSubTree key="" {filter} {model} {changeModel} {conid} {database} {connection} />
  </AppObjectListHandler>
</WidgetsInnerContainer>
