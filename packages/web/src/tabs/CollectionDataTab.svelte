<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('CollectionDataTab');

  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
  export const allowSwitchDatabase = props => true;

  registerCommand({
    id: 'collectionTable.save',
    group: 'save',
    category: 'Collection data',
    name: 'Save',
    // keyText: 'CtrlOrCommand+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });
</script>

<script lang="ts">
  import App from '../App.svelte';
  import DataGrid from '../datagrid/DataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';
  import {
    createChangeSet,
    createGridCache,
    CollectionGridDisplay,
    changeSetContainsChanges,
    runMacroOnChangeSet,
    changeSetChangedCount,
  } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { writable } from 'svelte/store';
  import createUndoReducer from '../utility/createUndoReducer';
  import invalidateCommands from '../commands/invalidateCommands';
  import CollectionDataGridCore from '../datagrid/CollectionDataGridCore.svelte';
  import { useCollectionInfo, useConnectionInfo } from '../utility/metadataLoaders';
  import { extensions } from '../stores';
  import CollectionJsonView from '../formview/CollectionJsonView.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { showModal } from '../modals/modalTools';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import ConfirmNoSqlModal from '../modals/ConfirmNoSqlModal.svelte';
  import registerCommand from '../commands/registerCommand';
  import { registerMenu } from '../utility/contextMenu';
  import { setContext } from 'svelte';
  import _ from 'lodash';
  import { apiCall } from '../utility/api';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import useEditorData from '../query/useEditorData';
  import { markTabSaved, markTabUnsaved } from '../utility/common';
  import { getNumberIcon } from '../icons/FontIcon.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  let loadedRows;

  export const activator = createActivator('CollectionDataTab', true);

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());

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

  $: {
    $changeSetStore;
    invalidateCommands();
  }

  $: connection = useConnectionInfo({ conid });
  $: collectionInfo = useCollectionInfo({ conid, database, schemaName, pureName });

  $: display =
    $collectionInfo && $connection
      ? new CollectionGridDisplay(
          $collectionInfo,
          findEngineDriver($connection, $extensions),
          //@ts-ignore
          $config,
          config.update,
          $cache,
          cache.update,
          loadedRows,
          $changeSetStore?.value,
          $connection?.isReadOnly
        )
      : null;
  // $: console.log('LOADED ROWS MONGO', loadedRows);

  async function handleConfirmChange(changeSet) {
    const resp = await apiCall('database-connections/update-collection', {
      conid,
      database,
      changeSet: {
        ...changeSet,
        updates: changeSet.updates.map(update => ({
          ...update,
          fields: _.mapValues(update.fields, (v, k) => (v === undefined ? { $$undefined$$: true } : v)),
        })),
      },
    });
    const { errorMessage } = resp || {};
    if (errorMessage) {
      showModal(ErrorMessageModal, { title: 'Error when saving', message: errorMessage });
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      display?.reload();
    }
  }

  export function canSave() {
    return changeSetContainsChanges($changeSetStore?.value);
  }

  export function save() {
    const json = $changeSetStore?.value;
    const driver = findEngineDriver($connection, $extensions);
    const script = driver.getCollectionUpdateScript ? driver.getCollectionUpdateScript(json, $collectionInfo) : null;
    if (script) {
      if (getBoolSettingsValue('skipConfirm.collectionDataSave', false)) {
        handleConfirmChange(json);
      } else {
        showModal(ConfirmNoSqlModal, {
          script,
          onConfirm: () => handleConfirmChange(json),
          engine: display.engine,
          skipConfirmSettingKey: 'skipConfirm.collectionDataSave',
        });
      }
    } else {
      handleConfirmChange(json);
    }
  }

  function handleRunMacro(macro, params, cells) {
    const newChangeSet = runMacroOnChangeSet(macro, params, cells, $changeSetStore?.value, display, false);
    if (newChangeSet) {
      dispatchChangeSet({ type: 'set', value: newChangeSet });
    }
  }

  registerMenu({ command: 'collectionTable.save', tag: 'save' });

  const collapsedLeftColumnStore = writable(getLocalStorage('collection_collapsedLeftColumn', false));
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
  $: setLocalStorage('collection_collapsedLeftColumn', $collapsedLeftColumnStore);

  const quickExportHandlerRef = createQuickExportHandlerRef();

  function handleSetLoadedRows(rows) {
    loadedRows = rows;
  }
</script>

<ToolStripContainer>
  <DataGrid
    setLoadedRows={handleSetLoadedRows}
    {...$$props}
    config={$config}
    setConfig={config.update}
    cache={$cache}
    setCache={cache.update}
    changeSetState={$changeSetStore}
    focusOnVisible
    {display}
    {changeSetStore}
    {dispatchChangeSet}
    gridCoreComponent={CollectionDataGridCore}
    jsonViewComponent={CollectionJsonView}
    isDynamicStructure
    showMacros
    macroCondition={macro => macro.type == 'transformValue'}
    onRunMacro={handleRunMacro}
  />
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataGrid.refresh" hideDisabled />
    <ToolStripCommandButton command="dataForm.refresh" hideDisabled />
    <ToolStripCommandButton
      command="collectionTable.save"
      iconAfter={getNumberIcon(changeSetChangedCount($changeSetStore?.value))}
    />
    <ToolStripCommandButton command="dataGrid.revertAllChanges" hideDisabled />
    <ToolStripCommandButton command="dataGrid.insertNewRow" hideDisabled />
    <ToolStripCommandButton command="dataGrid.deleteSelectedRows" hideDisabled />
    <ToolStripCommandButton command="dataGrid.addNewColumn" hideDisabled />
    <ToolStripCommandButton command="dataGrid.switchToJson" hideDisabled />
    <ToolStripCommandButton command="dataGrid.switchToTable" hideDisabled />
    <ToolStripExportButton {quickExportHandlerRef} command="collectionDataGrid.export" />
    <ToolStripCommandButton command="collectionJsonView.expandAll" hideDisabled />
    <ToolStripCommandButton command="collectionJsonView.collapseAll" hideDisabled />
  </svelte:fragment>
</ToolStripContainer>
