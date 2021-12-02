<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('CollectionDataTab');

  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;

  registerCommand({
    id: 'collectionTable.save',
    group: 'save',
    category: 'Collection data',
    name: 'Save',
    // keyText: 'Ctrl+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });

  registerCommand({
    id: 'collectionTable.newJson',
    category: 'Collection data',
    name: 'Add JSON document',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().addJsonDocument(),
  });
</script>

<script lang="ts">
  import App from '../App.svelte';
  import DataGrid from '../datagrid/DataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';
  import {
    createChangeSet,
    createGridCache,
    createGridConfig,
    TableFormViewDisplay,
    CollectionGridDisplay,
    changeSetContainsChanges,
  } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { writable } from 'svelte/store';
  import createUndoReducer from '../utility/createUndoReducer';
  import invalidateCommands from '../commands/invalidateCommands';
  import CollectionDataGridCore from '../datagrid/CollectionDataGridCore.svelte';
  import { useCollectionInfo, useConnectionInfo } from '../utility/metadataLoaders';
  import { extensions } from '../stores';
  import CollectionJsonView from '../jsonview/CollectionJsonView.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import axiosInstance from '../utility/axiosInstance';
  import { showModal } from '../modals/modalTools';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import ConfirmNoSqlModal from '../modals/ConfirmNoSqlModal.svelte';
  import registerCommand from '../commands/registerCommand';
  import { registerMenu } from '../utility/contextMenu';
  import EditJsonModal from '../modals/EditJsonModal.svelte';
  import ChangeSetGrider from '../datagrid/ChangeSetGrider';
  import { setContext } from 'svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  let loadedRows;

  export const activator = createActivator('CollectionDataTab', true);

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());

  const [changeSetStore, dispatchChangeSet] = createUndoReducer(createChangeSet());

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
          $changeSetStore?.value
        )
      : null;
  // $: console.log('LOADED ROWS MONGO', loadedRows);

  async function handleConfirmChange(changeSet) {
    const resp = await axiosInstance.request({
      url: 'database-connections/update-collection',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { changeSet },
    });
    const { errorMessage } = resp.data || {};
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
    const script = driver.getCollectionUpdateScript ? driver.getCollectionUpdateScript(json) : null;
    if (script) {
      showModal(ConfirmNoSqlModal, {
        script,
        onConfirm: () => handleConfirmChange(json),
        engine: display.engine,
      });
    } else {
      handleConfirmChange(json);
    }
  }

  export function addJsonDocument() {
    showModal(EditJsonModal, {
      json: {},
      onSave: value => {
        const grider = new ChangeSetGrider(loadedRows, $changeSetStore, dispatchChangeSet, display);
        const newRowIndex = grider.insertRow();
        grider.setRowData(newRowIndex, value);
        return true;
      },
    });
  }

  registerMenu({ command: 'collectionTable.save', tag: 'save' }, { command: 'collectionTable.newJson', tag: 'edit' });

  const collapsedLeftColumnStore = writable(false);
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
</script>

<DataGrid
  bind:loadedRows
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
/>
