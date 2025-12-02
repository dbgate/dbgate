<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('TableDataTab');
  const INTERVALS = [5, 10, 15, 30, 60];

  const INTERVAL_COMMANDS = [
    {
      time: 5,
      name: __t('command.datagrid.setAutoRefresh.5', { defaultMessage: 'Refresh every 5 seconds' }),
    },
    {
      time: 10,
      name: __t('command.datagrid.setAutoRefresh.10', { defaultMessage: 'Refresh every 10 seconds' }),
    },
    {
      time: 15,
      name: __t('command.datagrid.setAutoRefresh.15', { defaultMessage: 'Refresh every 15 seconds' }),
    },
    {
      time: 30,
      name: __t('command.datagrid.setAutoRefresh.30', { defaultMessage: 'Refresh every 30 seconds' }),
    },
    {
      time: 60,
      name: __t('command.datagrid.setAutoRefresh.60', { defaultMessage: 'Refresh every 60 seconds' }),
    },
  ]

  registerCommand({
    id: 'tableData.save',
    group: 'save',
    category: __t('command.tableData', { defaultMessage: 'Table data' }),
    name: __t('command.tableData.save', { defaultMessage: 'Save' }),
    // keyText: 'CtrlOrCommand+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });

  registerCommand({
    id: 'tableData.setAutoRefresh.1',
    category: __t('command.datagrid', { defaultMessage: 'Data grid' }),
    name: __t('command.datagrid.setAutoRefresh.1', { defaultMessage: 'Refresh every 1 second' }),
    isRelatedToTab: true,
    testEnabled: () => !!getCurrentEditor(),
    onClick: () => getCurrentEditor().setAutoRefresh(1),
  });

  for (const { time, name } of INTERVAL_COMMANDS) {
    registerCommand({
      id: `tableData.setAutoRefresh.${time}`,
      category: __t('command.datagrid', { defaultMessage: 'Data grid' }),
      name,
      isRelatedToTab: true,
      testEnabled: () => !!getCurrentEditor(),
      onClick: () => getCurrentEditor().setAutoRefresh(time),
    });
  }

  registerCommand({
    id: 'tableData.stopAutoRefresh',
    category: __t('command.datagrid', { defaultMessage: 'Data grid' }),
    name: __t('command.datagrid.stopAutoRefresh', { defaultMessage: 'Stop auto refresh' }),
    isRelatedToTab: true,
    keyText: 'CtrlOrCommand+Shift+R',
    testEnabled: () => getCurrentEditor()?.isAutoRefresh() === true,
    onClick: () => getCurrentEditor().stopAutoRefresh(null),
  });

  registerCommand({
    id: 'tableData.startAutoRefresh',
    category: __t('command.datagrid', { defaultMessage: 'Data grid' }),
    name: __t('command.datagrid.startAutoRefresh', { defaultMessage: 'Start auto refresh' }),
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
  import { getTableInfo, useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
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
  import { __t, _t } from '../translations';

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
      showModal(ErrorMessageModal, { title: _t('tableData.errorWhenSaving', { defaultMessage: 'Error when saving' }), message: errorMessage });
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      cache.update(reloadDataCacheFunc);
      showSnackbarSuccess(_t('tableData.savedToDatabase', { defaultMessage: 'Saved to database' }));
    }
  }

  export async function save() {
    const driver = findEngineDriver($connection, $extensions);
    const tablePermissionRole = (await getTableInfo({ conid, database, schemaName, pureName }))?.tablePermissionRole;

    if (tablePermissionRole == 'create_update_delete' || tablePermissionRole == 'update_only') {
      const resp = await apiCall('database-connections/save-table-data', {
        conid,
        database,
        changeSet: $changeSetStore?.value,
      });
      const { errorMessage } = resp || {};
      if (errorMessage) {
        showModal(ErrorMessageModal, { title: _t('tableData.errorWhenSaving', { defaultMessage: 'Error when saving' }), message: errorMessage });
      } else {
        dispatchChangeSet({ type: 'reset', value: createChangeSet() });
        cache.update(reloadDataCacheFunc);
        showSnackbarSuccess(_t('tableData.savedToDatabase', { defaultMessage: 'Saved to database' }));
      }
    } else {
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
      ...INTERVALS.map(seconds => ({ command: `tableData.setAutoRefresh.${seconds}`, text: `...${seconds}` + ' ' + _t('command.datagrid.autoRefresh.seconds', { defaultMessage: 'seconds' }) })),
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
      }}>{_t('datagrid.structure', { defaultMessage: 'Structure' })}</ToolStripButton
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
      buttonLabel={autoRefreshStarted ? _t('tableData.refreshEvery', { defaultMessage: 'Refresh (every {autoRefreshInterval}s)', values: { autoRefreshInterval } }) : null}
      commands={['dataGrid.refresh', ...createAutoRefreshMenu()]}
      hideDisabled
      data-testid="TableDataTab_refreshGrid"
    />
    <ToolStripCommandSplitButton
      buttonLabel={autoRefreshStarted ? _t('tableData.refreshEvery', { defaultMessage: 'Refresh (every {autoRefreshInterval}s)', values: { autoRefreshInterval } }) : null}
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
      on:click={() => collapsedLeftColumnStore.update(x => !x)}>{_t('tableData.viewColumns', { defaultMessage: 'View columns' })}</ToolStripButton
    >
  </svelte:fragment>
</ToolStripContainer>
