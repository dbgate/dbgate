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
  import {
    changeSetChangedCount,
    changeSetContainsChanges,
    changeSetToSql,
    createChangeSet,
    createGridCache,
    createQueryResultSaveChangeSet,
    reloadDataCacheFunc,
    ViewGridDisplay,
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
  import createUndoReducer from '../utility/createUndoReducer';
  import invalidateCommands from '../commands/invalidateCommands';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import { scriptToSql } from 'dbgate-sqltree';
  import { apiCall } from '../utility/api';
  import createActivator from '../utility/createActivator';
  import { _t } from '../translations';
  import { isProApp } from '../utility/proTools';
  import { getNumberIcon } from '../icons/FontIcon.svelte';
  import useEditorData from '../query/useEditorData';
  import { markTabSaved, markTabUnsaved } from '../utility/common';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let objectTypeField;

  $: connection = useConnectionInfo({ conid });
  $: viewInfo = useViewInfo({ conid, database, schemaName, pureName });
  $: serverVersion = useDatabaseServerVersion({ conid, database });
  $: dbinfo = useDatabaseInfo({ conid, database });

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());
  const settingsValue = useSettings();

  const { setEditorData } = useEditorData({
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

  export const activator = createActivator('ViewDataTab', true);

  let viewResultInfo = null;

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
          $settingsValue,
          viewResultInfo,
          isProApp() && !$connection?.isReadOnly
        )
      : null;

  $: {
    setEditorData($changeSetStore.value);
    if (changeSetContainsChanges($changeSetStore?.value)) {
      markTabUnsaved(tabid);
    } else {
      markTabSaved(tabid);
    }
  }

  $: {
    $changeSetStore;
    invalidateCommands();
  }

  function handleResultInfoLoaded(info) {
    viewResultInfo = info;
  }

  function getSaveChangeSet() {
    const changeSet = createQueryResultSaveChangeSet($changeSetStore?.value, viewResultInfo);
    if (!changeSetContainsChanges(changeSet)) return null;
    return changeSet;
  }

  function getSaveInfo() {
    const changeSet = getSaveChangeSet();
    if (!changeSet) return null;
    const driver = findEngineDriver($connection, $extensions);
    if (!driver || !$dbinfo) return null;
    const script = driver.createSaveChangeSetScript(changeSet, $dbinfo, () =>
      changeSetToSql(changeSet, $dbinfo, driver.dialect)
    );
    return {
      changeSet,
      sql: scriptToSql(driver, script),
      engine: driver.engine,
    };
  }

  export function canSave() {
    return isProApp() && !!findEngineDriver($connection, $extensions) && !!$dbinfo && !!getSaveChangeSet();
  }

  export async function save() {
    const saveInfo = getSaveInfo();
    if (!saveInfo) return;
    showModal(ConfirmSqlModal, {
      sql: saveInfo.sql,
      engine: saveInfo.engine,
      onConfirm: confirmedSql => handleConfirmSave(saveInfo.changeSet, confirmedSql),
    });
  }

  async function handleConfirmSave(changeSet, sql) {
    const resp = await apiCall('database-connections/save-query-result-data', {
      conid,
      database,
      changeSet,
      sql,
    });
    if (resp?.errorMessage) {
      showSnackbarError(resp.errorMessage);
      return;
    }
    dispatchChangeSet({ type: 'reset', value: createChangeSet() });
    cache.update(reloadDataCacheFunc);
    showSnackbarSuccess(_t('viewData.savedToDatabase', { defaultMessage: 'Saved to database' }));
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
      focusOnVisible
      hasMultiColumnFilter
      gridCoreComponent={SqlDataGridCore}
      formViewComponent={SqlFormView}
      changeSetState={$changeSetStore}
      {changeSetStore}
      {dispatchChangeSet}
      onResultInfoLoaded={handleResultInfoLoaded}
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
      <ToolStripExportButton {quickExportHandlerRef} />
      <ToolStripCommandButton command="dataGrid.fetchAll" hideDisabled />
      <ToolStripCommandButton command="dataGrid.toggleCellDataView" hideDisabled />
    </svelte:fragment>
  </ToolStripContainer>
{/if}

<StatusBarTabItem
  text="View columns"
  icon={$collapsedLeftColumnStore ? 'icon columns-outline' : 'icon columns'}
  clickable
  onClick={() => collapsedLeftColumnStore.update(x => !x)}
/>
