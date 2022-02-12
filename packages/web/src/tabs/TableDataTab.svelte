<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('TableDataTab');

  registerCommand({
    id: 'tableData.save',
    group: 'save',
    category: 'Table data',
    name: 'Save',
    // keyText: 'Ctrl+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });

  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import _ from 'lodash';
  import App from '../App.svelte';
  import TableDataGrid from '../datagrid/TableDataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';
  import {
    changeSetContainsChanges,
    changeSetToSql,
    createChangeSet,
    createGridCache,
    createGridConfig,
    getDeleteCascades,
    TableFormViewDisplay,
    TableGridDisplay,
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
  import { extensions } from '../stores';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import registerCommand from '../commands/registerCommand';
  import { registerMenu } from '../utility/contextMenu';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';
  import openNewTab from '../utility/openNewTab';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { setContext } from 'svelte';
  import { apiCall } from '../utility/api';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import ToolStripContainer from '../widgets/ToolStripContainer.svelte';
  import ToolbarCommandButton from '../widgets/ToolStripCommandButton.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export const activator = createActivator('TableDataTab', true);

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());
  const dbinfo = useDatabaseInfo({ conid, database });
  $: connection = useConnectionInfo({ conid });

  const [changeSetStore, dispatchChangeSet] = createUndoReducer(createChangeSet());

  async function handleConfirmSql(sql) {
    const resp = await apiCall('database-connections/run-script', { conid, database, sql });
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
    const script = changeSetToSql($changeSetStore?.value, $dbinfo);
    const deleteCascades = getDeleteCascades($changeSetStore?.value, $dbinfo);
    const sql = scriptToSql(driver, script);
    const deleteCascadesScripts = _.map(deleteCascades, ({ title, commands }) => ({
      title,
      script: scriptToSql(driver, commands),
    }));
    // console.log('deleteCascadesScripts', deleteCascadesScripts);
    showModal(ConfirmSqlModal, {
      sql,
      onConfirm: sqlOverride => handleConfirmSql(sqlOverride || sql),
      engine: driver.engine,
      deleteCascadesScripts,
    });
  }

  export function canSave() {
    return changeSetContainsChanges($changeSetStore?.value);
  }

  $: {
    $changeSetStore;
    invalidateCommands();
  }

  registerMenu({ command: 'tableData.save', tag: 'save' });

  const collapsedLeftColumnStore = writable(getLocalStorage('dataGrid_collapsedLeftColumn', false));
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
  $: setLocalStorage('dataGrid_collapsedLeftColumn', $collapsedLeftColumnStore);
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
    <ToolbarCommandButton command="dataGrid.refresh" />
    <ToolbarCommandButton command="tableData.save" />
    <ToolbarCommandButton command="dataGrid.insertNewRow" />
  </svelte:fragment>
</ToolStripContainer>

<StatusBarTabItem
  text="Open structure"
  icon="icon structure"
  clickable
  onClick={() => {
    openNewTab({
      title: pureName,
      icon: 'img table-structure',
      tabComponent: 'TableStructureTab',
      props: {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField: 'tables',
      },
    });
  }}
/>

<StatusBarTabItem
  text="View columns"
  icon={$collapsedLeftColumnStore ? 'icon columns-outline' : 'icon columns'}
  clickable
  onClick={() => collapsedLeftColumnStore.update(x => !x)}
/>
