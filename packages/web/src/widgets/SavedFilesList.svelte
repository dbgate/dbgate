<script lang="ts">
  import _ from 'lodash';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as savedFileAppObject from '../appobj/SavedFileAppObject.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';
  import { useFiles, useTeamFiles, useConnectionList } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { isProApp } from '../utility/proTools';
  import InlineUploadButton from '../buttons/InlineUploadButton.svelte';
  import { DATA_FOLDER_NAMES, getConnectionLabel } from 'dbgate-tools';
  import { _t } from '../translations';
  import { currentDropDownMenu, currentDatabase } from '../stores';

  let filter = '';
  let selectedConnectionId = '';
  let domConnectionBtn: HTMLElement;

  const connectionList = useConnectionList();
  const sqlFiles = useFiles({ folder: 'sql', parseFrontMatter: true });
  const shellFiles = useFiles({ folder: 'shell' });
  const markdownFiles = useFiles({ folder: 'markdown' });
  const chartFiles = useFiles({ folder: 'charts' });
  const queryFiles = useFiles({ folder: 'query' });
  const sqliteFiles = useFiles({ folder: 'sqlite' });
  const diagramFiles = useFiles({ folder: 'diagrams' });
  const importExportJobFiles = useFiles({ folder: 'impexp' });
  const dataDeployJobFiles = useFiles({ folder: 'datadeploy' });
  const dbCompareJobFiles = useFiles({ folder: 'dbcompare' });
  const perspectiveFiles = useFiles({ folder: 'perspectives' });
  const modelTransformFiles = useFiles({ folder: 'modtrans' });
  const themeFiles = useFiles({ folder: 'themes' });
  const appFiles = useFiles({ folder: 'apps' });
  const teamFiles = useTeamFiles({});

  function makeConnectionKey(connectionId: string, databaseName: string | undefined) {
    return databaseName ? `${connectionId}::${databaseName}` : connectionId;
  }

  $: connectionDbOptions = _.uniqBy(
    (($sqlFiles || []) as any[])
      .filter(f => f.connectionId)
      .map(f => {
        const conn = (($connectionList || []) as any[]).find(c => c._id === f.connectionId);
        const connLabel = conn ? getConnectionLabel(conn) : f.connectionId;
        const label = f.databaseName ? `${connLabel} - ${f.databaseName}` : connLabel;
        return {
          value: makeConnectionKey(f.connectionId, f.databaseName),
          label: label as string,
          connectionId: f.connectionId,
          databaseName: f.databaseName,
        };
      }),
    x => x.value
  );

  $: connectionOptions = (() => {
    const grouped = _.groupBy(connectionDbOptions, o => o.connectionId);
    const connectionGroups = Object.entries(grouped)
      .map(([connId, items]) => {
        const conn = (($connectionList || []) as any[]).find(c => c._id === connId);
        const connLabel = conn ? getConnectionLabel(conn) : connId;
        const hasMultipleDbs = items.length > 1 || items.some(i => i.databaseName);
        const dbItems = [...items].sort((a, b) => (a.databaseName || '').localeCompare(b.databaseName || ''));

        return {
          sortLabel: connLabel || connId,
          options: [
            ...(hasMultipleDbs
              ? [
                  {
                    value: `conn-all::${connId}`,
                    label: `${connLabel} - ${_t('files.allDatabases', { defaultMessage: 'all databases' })}`,
                  },
                ]
              : []),
            ...dbItems,
          ],
        };
      })
      .sort((a, b) => a.sortLabel.localeCompare(b.sortLabel));

    return connectionGroups.flatMap(group => group.options);
  })();

  $: currentDbFilterOption = (() => {
    if (!$currentDatabase?.connection?._id) return null;
    const connId = $currentDatabase.connection._id;
    const dbName = $currentDatabase.name;
    const hasFiles = (($sqlFiles || []) as any[]).some(f => f.connectionId === connId && f.databaseName === dbName);
    if (!hasFiles) return null;
    const conn = (($connectionList || []) as any[]).find(c => c._id === connId);
    const connLabel = conn ? getConnectionLabel(conn) : connId;
    const label = dbName ? `${connLabel} - ${dbName}` : connLabel;
    return { value: `current-db`, label };
  })();

  $: filteredSqlFiles = (() => {
    if (!selectedConnectionId) return $sqlFiles || [];
    if (selectedConnectionId === 'current-db') {
      const connId = $currentDatabase?.connection?._id;
      const dbName = $currentDatabase?.name;
      return ($sqlFiles || []).filter(f => f.connectionId === connId && f.databaseName === dbName);
    }
    if (selectedConnectionId.startsWith('conn-all::')) {
      const connId = selectedConnectionId.slice('conn-all::'.length);
      return ($sqlFiles || []).filter(f => f.connectionId === connId);
    }
    return ($sqlFiles || []).filter(f => makeConnectionKey(f.connectionId, f.databaseName) === selectedConnectionId);
  })();

  $: files = [
    ...filteredSqlFiles,
    ...(selectedConnectionId ? [] : $shellFiles || []),
    ...(selectedConnectionId ? [] : $markdownFiles || []),
    ...(selectedConnectionId ? [] : $chartFiles || []),
    ...(selectedConnectionId ? [] : $queryFiles || []),
    ...(selectedConnectionId ? [] : $sqliteFiles || []),
    ...(selectedConnectionId ? [] : $diagramFiles || []),
    ...(selectedConnectionId ? [] : $perspectiveFiles || []),
    ...(selectedConnectionId ? [] : $importExportJobFiles || []),
    ...(selectedConnectionId ? [] : $modelTransformFiles || []),
    ...(selectedConnectionId ? [] : $themeFiles || []),
    ...((isProApp() && !selectedConnectionId && $dataDeployJobFiles) || []),
    ...((isProApp() && !selectedConnectionId && $dbCompareJobFiles) || []),
    ...((isProApp() && !selectedConnectionId && $appFiles) || []),
    ...(selectedConnectionId ? [] : $teamFiles || []),
  ];

  $: currentConnectionLabel = (() => {
    if (!selectedConnectionId) return _t('files.allConnections', { defaultMessage: 'All connections' });
    if (selectedConnectionId === 'current-db' && currentDbFilterOption) {
      return `${_t('files.currentDatabase', { defaultMessage: 'Current database' })}: ${currentDbFilterOption.label}`;
    }
    return connectionOptions.find(o => o.value === selectedConnectionId)?.label ?? selectedConnectionId;
  })();

  function openConnectionDropdown() {
    const rect = domConnectionBtn.getBoundingClientRect();
    const items: any[] = [
      {
        text: _t('files.allConnections', { defaultMessage: 'All connections' }),
        onClick: () => {
          selectedConnectionId = '';
        },
      },
    ];
    if (currentDbFilterOption) {
      items.push({
        text: `${_t('files.currentDatabase', { defaultMessage: 'Current database' })}: ${currentDbFilterOption.label}`,
        onClick: () => {
          selectedConnectionId = 'current-db';
        },
      });
    }
    items.push(
      ...connectionOptions.map(opt => ({
        text: opt.label,
        onClick: () => {
          selectedConnectionId = opt.value;
        },
      }))
    );
    currentDropDownMenu.set({
      left: rect.left,
      top: rect.bottom,
      items,
    });
  }

  function handleRefreshFiles() {
    apiCall('files/refresh', {
      folders: DATA_FOLDER_NAMES.map(folder => folder.name),
    });
  }

  function dataFolderTitle(folder) {
    const foundFolder = DATA_FOLDER_NAMES.find(f => f.name === folder);
    return foundFolder ? foundFolder.label : _.startCase(folder);
  }

  async function handleUploadedFile(filePath, fileName) {
    await apiCall('files/save-uploaded-file', { filePath, fileName });
  }
</script>

<SearchBoxWrapper {filter}>
  <SearchInput
    placeholder={_t('files.searchSavedFiles', { defaultMessage: 'Search saved files' })}
    bind:value={filter}
  />
  <CloseSearchButton bind:filter />
  <InlineUploadButton
    filters={[
      {
        name: _t('files.allSupportedFiles', { defaultMessage: 'All supported files' }),
        extensions: ['sql'],
      },
      { name: _t('files.sqlFiles', { defaultMessage: 'SQL files' }), extensions: ['sql'] },
    ]}
    onProcessFile={handleUploadedFile}
  />
  <InlineButton
    on:click={handleRefreshFiles}
    title={_t('files.refreshFiles', { defaultMessage: 'Refresh files' })}
    data-testid="SavedFileList_buttonRefresh"
  >
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>

{#if connectionOptions.length > 0}
  <div class="connection-filter">
    <div class="mr-1">{_t('files.connection', { defaultMessage: 'Connection' })}:</div>
    <button
      class="connection-select-btn"
      bind:this={domConnectionBtn}
      on:click={openConnectionDropdown}
      data-testid="SavedFilesList_connectionFilter"
    >
      <span class="connection-label">{currentConnectionLabel}</span>
      <FontIcon icon="icon chevron-down" />
    </button>
    {#if selectedConnectionId}
      <InlineButton
        on:click={() => {
          selectedConnectionId = '';
        }}
        title={_t('files.clearConnectionFilter', { defaultMessage: 'Clear connection filter' })}
        data-testid="SavedFilesList_clearConnectionFilter"
      >
        <FontIcon icon="icon close" />
      </InlineButton>
    {/if}
  </div>
{/if}

<WidgetsInnerContainer>
  <AppObjectList
    list={files}
    module={savedFileAppObject}
    groupFunc={data =>
      data.teamFolderId == -1
        ? _t('files.teamFiles', { defaultMessage: 'Team files' })
        : data.teamFolderName || dataFolderTitle(data.folder)}
    {filter}
  />
</WidgetsInnerContainer>

<style>
  .connection-filter {
    display: flex;
    border-bottom: var(--theme-card-border);
    margin-bottom: 5px;
    align-items: center;
    padding-left: 5px;
    gap: 2px;
  }

  .connection-select-btn {
    flex: 1 1 0%;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 4px;
    background-color: var(--theme-searchbox-background);
    border: var(--theme-searchbox-border);
    cursor: pointer;
    color: var(--theme-font-1);
    font-size: inherit;
    font-family: inherit;
    overflow: hidden;
  }

  .connection-select-btn:hover {
    background-color: var(--theme-bg-hover);
  }

  .connection-label {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
</style>
