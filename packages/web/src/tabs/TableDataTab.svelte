<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('TableDataTab');
  const INTERVALS = [5, 10, 15, 13, 60];

  registerCommand({
    id: 'tableData.save',
    group: 'save',
    category: 'Table data',
    name: 'Save',
    // keyText: 'CtrlOrCommand+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });

  registerCommand({
    id: 'tableData.setAutoRefresh.1',
    category: 'Data grid',
    name: 'Refresh every 1 second',
    isRelatedToTab: true,
    testEnabled: () => !!getCurrentEditor(),
    onClick: () => getCurrentEditor().setAutoRefresh(1),
  });

  for (const seconds of INTERVALS) {
    registerCommand({
      id: `tableData.setAutoRefresh.${seconds}`,
      category: 'Data grid',
      name: `Refresh every ${seconds} seconds`,
      isRelatedToTab: true,
      testEnabled: () => !!getCurrentEditor(),
      onClick: () => getCurrentEditor().setAutoRefresh(seconds),
    });
  }

  registerCommand({
    id: 'tableData.stopAutoRefresh',
    category: 'Data grid',
    name: 'Stop auto refresh',
    isRelatedToTab: true,
    keyText: 'CtrlOrCommand+Shift+R',
    testEnabled: () => getCurrentEditor()?.isAutoRefresh() === true,
    onClick: () => getCurrentEditor().stopAutoRefresh(null),
  });

  registerCommand({
    id: 'tableData.startAutoRefresh',
    category: 'Data grid',
    name: 'Start auto refresh',
    isRelatedToTab: true,
    keyText: 'CtrlOrCommand+Shift+R',
    testEnabled: () => getCurrentEditor()?.isAutoRefresh() === false,
    onClick: () => getCurrentEditor().startAutoRefresh(),
  });

  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName', 'isRawMode'];
  export const allowAddToFavorites = props => true;
  export const allowSwitchDatabase = props => true;
</script>

<script lang="ts">
  import _ from 'lodash';
  import App from '../App.svelte';
  import TableDataGrid from '../datagrid/TableDataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';
  import {
    changeSetChangedCount,
    changeSetContainsChanges,
    changeSetToSql,
    createChangeSet,
    createGridCache,
    getDeleteCascades,
  } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { reloadDataCacheFunc } from 'dbgate-datalib';
  import { writable } from 'svelte/store';
  import createUndoReducer from '../utility/createUndoReducer';
  import invalidateCommands from '../commands/invalidateCommands';
  import { showModal } from '../modals/modalTools';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import { scriptToSql } from 'dbgate-sqltree';
  import { extensions, lastUsedDefaultActions } from '../stores';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import registerCommand from '../commands/registerCommand';
  import { registerMenu } from '../utility/contextMenu';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import openNewTab from '../utility/openNewTab';
  import { onDestroy, setContext } from 'svelte';
  import { apiCall } from '../utility/api';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import ToolStripCommandSplitButton from '../buttons/ToolStripCommandSplitButton.svelte';
  import { getBoolSettingsValue, getIntSettingsValue } from '../settings/settingsTools';
  import useEditorData from '../query/useEditorData';
  import { markTabSaved, markTabUnsaved } from '../utility/common';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import { getNumberIcon } from '../icons/FontIcon.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let isRawMode = false;
  export let tabPreviewMode;

  export const activator = createActivator('TableDataTab', true);

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());
  const dbinfo = useDatabaseInfo({ conid, database });

  let autoRefreshInterval = getIntSettingsValue('dataGrid.defaultAutoRefreshInterval', 10, 1, 3600);
  let autoRefreshStarted = false;
  let autoRefreshTimer = null;

  $: connection = useConnectionInfo({ conid });

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      dispatchChangeSet({ type: 'reset', value });
      invalidateCommands();
      if (changeSetContainsChanges(value)) {
        markTabUnsaved(tabid);
      }
    },
  });

  const [changeSetStore, dispatchChangeSet] = createUndoReducer(createChangeSet());

  $: {
    setEditorData($changeSetStore.value);
    if (changeSetContainsChanges($changeSetStore?.value)) {
      markTabUnsaved(tabid);
    } else {
      markTabSaved(tabid);
    }
  }

  async function handleConfirmSql(sql) {
    const resp = await apiCall('database-connections/run-script', { conid, database, sql, useTransaction: true });
    const { errorMessage } = resp || {};
    if (errorMessage) {
      showModal(ErrorMessageModal, { title: 'Error when saving', message: errorMessage });
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      cache.update(reloadDataCacheFunc);
      showSnackbarSuccess('Saved to database');
    }
  }

  export function save() {
    const driver = findEngineDriver($connection, $extensions);

    const script = driver.createSaveChangeSetScript($changeSetStore?.value, $dbinfo, () =>
      changeSetToSql($changeSetStore?.value, $dbinfo, driver.dialect)
    );

    const deleteCascades = getDeleteCascades($changeSetStore?.value, $dbinfo);
    const sql = scriptToSql(driver, script);
    const deleteCascadesScripts = _.map(deleteCascades, ({ title, commands }) => ({
      title,
      script: scriptToSql(driver, commands),
    }));
    // console.log('deleteCascadesScripts', deleteCascadesScripts);
    if (getBoolSettingsValue('skipConfirm.tableDataSave', false) && !deleteCascadesScripts?.length) {
      handleConfirmSql(sql);
    } else {
      showModal(ConfirmSqlModal, {
        sql,
        onConfirm: confirmedSql => handleConfirmSql(confirmedSql),
        engine: driver.engine,
        deleteCascadesScripts,
        skipConfirmSettingKey: deleteCascadesScripts?.length ? null : 'skipConfirm.tableDataSave',
      });
    }
  }

  export function canSave() {
    return changeSetContainsChanges($changeSetStore?.value);
  }

  export function setAutoRefresh(interval) {
    autoRefreshInterval = interval;
    startAutoRefresh();
    invalidateCommands();
  }

  export function isAutoRefresh() {
    return autoRefreshStarted;
  }

  export function startAutoRefresh() {
    closeRefreshTimer();
    autoRefreshTimer = setInterval(() => {
      cache.update(reloadDataCacheFunc);
    }, autoRefreshInterval * 1000);
    autoRefreshStarted = true;
    invalidateCommands();
  }

  export function stopAutoRefresh() {
    closeRefreshTimer();
    autoRefreshStarted = false;
    invalidateCommands();
  }

  function closeRefreshTimer() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  $: {
    $changeSetStore;
    invalidateCommands();
  }

  registerMenu({ command: 'tableData.save', tag: 'save' });

  const collapsedLeftColumnStore = writable(getLocalStorage('dataGrid_collapsedLeftColumn', false));
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
  $: setLocalStorage('dataGrid_collapsedLeftColumn', $collapsedLeftColumnStore);

  onDestroy(() => {
    closeRefreshTimer();
  });

  const quickExportHandlerRef = createQuickExportHandlerRef();

  function createAutoRefreshMenu() {
    return [
      { divider: true },
      { command: 'dataGrid.deepRefresh', hideDisabled: true },
      { command: 'tableData.stopAutoRefresh', hideDisabled: true },
      { command: 'tableData.startAutoRefresh', hideDisabled: true },
      'tableData.setAutoRefresh.1',
      ...INTERVALS.map(seconds => ({ command: `tableData.setAutoRefresh.${seconds}`, text: `...${seconds} seconds` })),
    ];
  }
</script>

<ToolStripContainer>
  <TableDataGrid
    {...$$props}
    config={$config}
    setConfig={config.update}
    cache={$cache}
    setCache={cache.update}
    changeSetState={$changeSetStore}
    focusOnVisible
    {changeSetStore}
    {dispatchChangeSet}
  />

  <svelte:fragment slot="toolstrip">
    <ToolStripButton
      icon="icon structure"
      iconAfter="icon arrow-link"
      on:click={() => {
        if (tabPreviewMode && getBoolSettingsValue('defaultAction.useLastUsedAction', true)) {
          lastUsedDefaultActions.update(actions => ({
            ...actions,
            tables: 'openStructure',
          }));
        }

        openNewTab({
          title: pureName,
          icon: 'img table-structure',
          tabComponent: 'TableStructureTab',
          tabPreviewMode: true,
          props: {
            schemaName,
            pureName,
            conid,
            database,
            objectTypeField: 'tables',
            defaultActionId: 'openStructure',
          },
        });
      }}>Structure</ToolStripButton
    >

    <ToolStripButton
      icon="img sql-file"
      iconAfter="icon arrow-link"
      on:click={() => {
        if (tabPreviewMode && getBoolSettingsValue('defaultAction.useLastUsedAction', true)) {
          lastUsedDefaultActions.update(actions => ({
            ...actions,
            tables: 'showSql',
          }));
        }

        openNewTab({
          title: pureName,
          icon: 'img sql-file',
          tabComponent: 'SqlObjectTab',
          tabPreviewMode: true,
          props: {
            schemaName,
            pureName,
            conid,
            database,
            objectTypeField: 'tables',
            defaultActionId: 'showSql',
          },
        });
      }}>SQL</ToolStripButton
    >

    <ToolStripCommandSplitButton
      buttonLabel={autoRefreshStarted ? `Refresh (every ${autoRefreshInterval}s)` : null}
      commands={['dataGrid.refresh', ...createAutoRefreshMenu()]}
      hideDisabled
      data-testid="TableDataTab_refreshGrid"
    />
    <ToolStripCommandSplitButton
      buttonLabel={autoRefreshStarted ? `Refresh (every ${autoRefreshInterval}s)` : null}
      commands={['dataForm.refresh', ...createAutoRefreshMenu()]}
      hideDisabled
      data-testid="TableDataTab_refreshForm"
    />

    <!-- <ToolStripCommandButton command="dataGrid.refresh" hideDisabled />
    <ToolStripCommandButton command="dataForm.refresh" hideDisabled /> -->

    <ToolStripCommandButton command="dataForm.goToFirst" hideDisabled data-testid="TableDataTab_goToFirst" />
    <ToolStripCommandButton command="dataForm.goToPrevious" hideDisabled data-testid="TableDataTab_goToPrevious" />
    <ToolStripCommandButton command="dataForm.goToNext" hideDisabled data-testid="TableDataTab_goToNext" />
    <ToolStripCommandButton command="dataForm.goToLast" hideDisabled data-testid="TableDataTab_goToLast" />

    <ToolStripCommandButton
      command="tableData.save"
      iconAfter={getNumberIcon(changeSetChangedCount($changeSetStore?.value))}
      data-testid="TableDataTab_save"
    />
    <ToolStripCommandButton
      command="dataGrid.revertAllChanges"
      hideDisabled
      data-testid="TableDataTab_revertAllChanges"
    />
    <ToolStripCommandButton command="dataGrid.insertNewRow" hideDisabled data-testid="TableDataTab_insertNewRow" />
    <ToolStripCommandButton
      command="dataGrid.deleteSelectedRows"
      hideDisabled
      data-testid="TableDataTab_deleteSelectedRows"
    />
    <ToolStripCommandButton command="dataGrid.switchToForm" hideDisabled data-testid="TableDataTab_switchToForm" />
    <ToolStripCommandButton command="dataGrid.switchToTable" hideDisabled data-testid="TableDataTab_switchToTable" />
    <ToolStripExportButton {quickExportHandlerRef} />

    <ToolStripButton
      icon={$collapsedLeftColumnStore ? 'icon columns-outline' : 'icon columns'}
      on:click={() => collapsedLeftColumnStore.update(x => !x)}>View columns</ToolStripButton
    >
  </svelte:fragment>
</ToolStripContainer>
