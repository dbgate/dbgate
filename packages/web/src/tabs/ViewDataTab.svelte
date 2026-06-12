<script lang="ts" context="module">
  import { getActiveComponent } from '../utility/createActivator';
  import registerCommand from '../commands/registerCommand';
  import { __t } from '../translations';
  const getCurrentEditor = () => getActiveComponent('ViewDataTab');

  registerCommand({
    id: 'viewData.save',
    group: 'save',
    category: __t('command.viewData', { defaultMessage: 'View data' }),
    name: __t('command.viewData.save', { defaultMessage: 'Save' }),
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });

  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
  export const allowSwitchDatabase = props => true;
</script>

<script lang="ts">
  import { createGridCache, ViewGridDisplay } from 'dbgate-datalib';
  import {
    changeSetChangedCount,
    changeSetContainsChanges,
    changeSetToSql,
    createChangeSet,
    reloadDataCacheFunc,
  } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';

  import DataGrid from '../datagrid/DataGrid.svelte';
  import SqlDataGridCore from '../datagrid/SqlDataGridCore.svelte';
  import SqlFormView from '../formview/SqlFormView.svelte';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { extensions } from '../stores';
  import {
    useConnectionInfo,
    useDatabaseInfo,
    useDatabaseServerVersion,
    useSettings,
    useViewInfo,
  } from '../utility/metadataLoaders';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import useGridConfig from '../utility/useGridConfig';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import openNewTab from '../utility/openNewTab';
  import createActivator from '../utility/createActivator';
  import { registerMenu } from '../utility/contextMenu';
  import { apiCall } from '../utility/api';
  import { showModal } from '../modals/modalTools';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import { _t } from '../translations';
  import invalidateCommands from '../commands/invalidateCommands';
  import useEditorData from '../query/useEditorData';
  import createUndoReducer from '../utility/createUndoReducer';
  import { markTabSaved, markTabUnsaved } from '../utility/common';
  import { scriptToSql } from 'dbgate-sqltree';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import { getNumberIcon } from '../icons/FontIcon.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let objectTypeField;

  export const activator = createActivator('ViewDataTab', true);

  $: connection = useConnectionInfo({ conid });
  $: viewInfo = useViewInfo({ conid, database, schemaName, pureName });
  $: serverVersion = useDatabaseServerVersion({ conid, database });
  $: dbinfo = useDatabaseInfo({ conid, database });

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());
  const settingsValue = useSettings();

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
      showModal(ErrorMessageModal, {
        title: _t('viewData.errorWhenSaving', { defaultMessage: 'Error when saving' }),
        message: errorMessage,
      });
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      cache.update(reloadDataCacheFunc);
      showSnackbarSuccess(_t('viewData.savedToDatabase', { defaultMessage: 'Saved to database' }));
    }
  }

  export async function save() {
    const driver = findEngineDriver($connection, $extensions);
    const script = driver.createSaveChangeSetScript($changeSetStore?.value, $dbinfo, () =>
      changeSetToSql($changeSetStore?.value, $dbinfo, driver.dialect)
    );
    const sql = scriptToSql(driver, script);
    
    if (getBoolSettingsValue('skipConfirm.viewDataSave', false)) {
      handleConfirmSql(sql);
    } else {
      showModal(ConfirmSqlModal, {
        sql,
        onConfirm: confirmedSql => handleConfirmSql(confirmedSql),
        engine: driver.engine,
        skipConfirmSettingKey: 'skipConfirm.viewDataSave',
      });
    }
  }

  export function canSave() {
    return changeSetContainsChanges($changeSetStore?.value);
  }

  $: display =
    $viewInfo && $connection && $serverVersion
      ? new ViewGridDisplay(
          $viewInfo,
          findEngineDriver($connection, $extensions),
          //@ts-ignore
          $config,
          config.update,
          $cache,
          cache.update,
          $dbinfo,
          $serverVersion,
          $settingsValue
        )
      : null;

  registerMenu({ command: 'viewData.save', tag: 'save' });

  $: {
    $changeSetStore;
    invalidateCommands();
  }

  const collapsedLeftColumnStore = writable(getLocalStorage('dataGrid_collapsedLeftColumn', false));
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
  $: setLocalStorage('dataGrid_collapsedLeftColumn', $collapsedLeftColumnStore);

  const quickExportHandlerRef = createQuickExportHandlerRef();
</script>

{#if display}
  <ToolStripContainer>
    <DataGrid
      {...$$props}
      {display}
      config={$config}
      setConfig={config.update}
      cache={$cache}
      setCache={cache.update}
      changeSetState={$changeSetStore}
      focusOnVisible
      hasMultiColumnFilter
      gridCoreComponent={SqlDataGridCore}
      formViewComponent={SqlFormView}
      {changeSetStore}
      {dispatchChangeSet}
    />
    <svelte:fragment slot="toolstrip">
      <ToolStripButton
        icon="icon structure"
        iconAfter="icon arrow-link"
        on:click={() => {
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
              objectTypeField,
              defaultActionId: 'openStructure',
            },
          });
        }}>Structure</ToolStripButton
      >

      <ToolStripButton
        icon="img sql-file"
        iconAfter="icon arrow-link"
        on:click={() => {
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
              objectTypeField,
              defaultActionId: 'showSql',
            },
          });
        }}>SQL</ToolStripButton
      >

      <ToolStripCommandButton command="dataGrid.refresh" />
      <ToolStripExportButton {quickExportHandlerRef} />
      <ToolStripCommandButton command="dataGrid.fetchAll" hideDisabled />
      <ToolStripCommandButton
        command="viewData.save"
        iconAfter={getNumberIcon(changeSetChangedCount($changeSetStore?.value))}
        data-testid="ViewDataTab_save"
      />
      <ToolStripCommandButton
        command="dataGrid.revertAllChanges"
        hideDisabled
        data-testid="ViewDataTab_revertAllChanges"
      />
      <ToolStripCommandButton
        command="dataGrid.insertNewRow"
        hideDisabled
        data-testid="ViewDataTab_insertNewRow"
      />
      <ToolStripCommandButton
        command="dataGrid.deleteSelectedRows"
        hideDisabled
        data-testid="ViewDataTab_deleteSelectedRows"
      />
      <ToolStripCommandButton
        command="dataGrid.toggleCellDataView"
        hideDisabled
        data-testid="ViewDataTab_toggleCellDataView"
      />
    </svelte:fragment>
  </ToolStripContainer>
{/if}

<StatusBarTabItem
  text="View columns"
  icon={$collapsedLeftColumnStore ? 'icon columns-outline' : 'icon columns'}
  clickable
  onClick={() => collapsedLeftColumnStore.update(x => !x)}
/>
