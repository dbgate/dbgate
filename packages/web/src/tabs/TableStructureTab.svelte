<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
  const getCurrentEditor = () => getActiveComponent('TableStructureTab');

  registerCommand({
    id: 'tableStructure.save',
    group: 'save',
    category: 'Table editor',
    name: 'Save',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });

  registerCommand({
    id: 'tableStructure.reset',
    category: 'Table editor',
    name: 'Reset changes',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon close',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().reset(),
  });
</script>

<script lang="ts">
  import {
    fillConstraintNames,
    extendTableInfo,
    findEngineDriver,
    generateTablePairingId,
    getAlterTableScript,
  } from 'dbgate-tools';

  import _ from 'lodash';
  import registerCommand from '../commands/registerCommand';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import ConstraintLabel from '../elements/ConstraintLabel.svelte';
  import ForeignKeyObjectListControl from '../elements/ForeignKeyObjectListControl.svelte';

  import { extensions } from '../stores';
  import useEditorData from '../query/useEditorData';
  import TableEditor from '../tableeditor/TableEditor.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  import { useConnectionInfo, useDatabaseInfo, useDbCore } from '../utility/metadataLoaders';
  import { showModal } from '../modals/modalTools';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { changeTab } from '../utility/common';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';
  import openNewTab from '../utility/openNewTab';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let objectTypeField = 'tables';
  let domEditor;

  let savedName;

  export const activator = createActivator('TableStructureTab', true);

  $: tableInfo = useDbCore({ conid, database, schemaName, pureName: savedName || pureName, objectTypeField });
  $: dbInfo = useDatabaseInfo({ conid, database });
  $: tableInfoWithPairingId = $tableInfo ? generateTablePairingId($tableInfo) : null;
  $: connection = useConnectionInfo({ conid });

  const { editorState, editorValue, setEditorData, clearEditorData } = useEditorData({ tabid });

  $: showTable = $editorValue ? $editorValue.current : tableInfoWithPairingId;

  export function canSave() {
    return objectTypeField == 'tables' && !!$editorValue;
  }

  export function save() {
    if ($editorValue.base) {
      doSave(null);
    } else {
      showModal(InputTextModal, {
        header: 'Set table name',
        value: savedName || 'newTable',
        label: 'Table name',
        onConfirm: name => {
          savedName = name;
          setEditorData(tbl => ({
            base: tbl.base,
            current: {
              ...tbl.current,
              pureName: name,
            },
          }));
          doSave(name);
        },
      });
    }
  }

  function doSave(createTableName) {
    const driver = findEngineDriver($connection, $extensions);

    const { sql, recreates } = getAlterTableScript(
      $editorValue.base,
      extendTableInfo(fillConstraintNames($editorValue.current, driver.dialect)),
      {},
      $dbInfo,
      driver
    );

    showModal(ConfirmSqlModal, {
      sql,
      recreates,
      onConfirm: () => {
        handleConfirmSql(sql, createTableName);
      },
      engine: driver.engine,
    });
  }

  async function handleConfirmSql(sql, createTableName) {
    const resp = await axiosInstance.request({
      url: 'database-connections/run-script',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { sql },
    });
    const { errorMessage } = resp.data || {};
    if (errorMessage) {
      showModal(ErrorMessageModal, { title: 'Error when saving', message: errorMessage });
    } else {
      if (createTableName) {
        changeTab(tabid, tab => ({
          ...tab,
          title: createTableName,
          props: {
            ...tab.props,
            pureName: createTableName,
          },
        }));
      }

      await axiosInstance.post('database-connections/sync-model', { conid, database });
      showSnackbarSuccess('Saved to database');
      clearEditorData();
    }
  }

  export async function reset() {
    await axiosInstance.post('database-connections/sync-model', { conid, database });
    clearEditorData();
  }

  $: {
    // if (!$editorState.isLoading && !$editorValue)
    if (domEditor && !pureName) domEditor.addColumn();
  }
</script>

<TableEditor
  bind:this={domEditor}
  tableInfo={showTable}
  dbInfo={$dbInfo}
  setTableInfo={objectTypeField == 'tables'
    ? tableInfoUpdater =>
        setEditorData(tbl =>
          tbl
            ? {
                base: tbl.base,
                current: tableInfoUpdater(tbl.current),
              }
            : {
                base: tableInfoWithPairingId,
                current: tableInfoUpdater(tableInfoWithPairingId),
              }
        )
    : null}
/>

{#if objectTypeField == 'tables'}
  <StatusBarTabItem
    text="Open data"
    icon="icon table"
    clickable
    onClick={() => {
      openNewTab({
        title: pureName,
        icon: 'img table',
        tabComponent: 'TableDataTab',
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
{/if}
