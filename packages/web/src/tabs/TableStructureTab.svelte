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
    testEnabled: () => getCurrentEditor()?.canResetChanges(),
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

  import { extensions, lastUsedDefaultActions } from '../stores';
  import useEditorData from '../query/useEditorData';
  import TableEditor from '../tableeditor/TableEditor.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  import { useConnectionInfo, useDatabaseInfo, useDbCore, useSchemaList } from '../utility/metadataLoaders';
  import { showModal } from '../modals/modalTools';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import openNewTab from '../utility/openNewTab';
  import { apiCall } from '../utility/api';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import hasPermission from '../utility/hasPermission';
  import { changeTab, markTabSaved, markTabUnsaved } from '../utility/common';
  import { getBoolSettingsValue } from '../settings/settingsTools';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let objectTypeField = 'tables';
  export let tabPreviewMode;
  let domEditor;

  let savedName;
  let resetCounter = 0;

  export const activator = createActivator('TableStructureTab', true);

  $: tableInfo = useDbCore({ conid, database, schemaName, pureName: savedName || pureName, objectTypeField });
  $: dbInfo = useDatabaseInfo({ conid, database });
  $: tableInfoWithPairingId = $tableInfo ? generateTablePairingId($tableInfo) : null;
  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: schemaList = useSchemaList({ conid, database });

  const { editorState, editorValue, setEditorData, clearEditorData } = useEditorData({ tabid });

  $: showTable = $editorValue ? $editorValue.current : tableInfoWithPairingId;

  export function canSave() {
    return objectTypeField == 'tables' && !!$editorValue && !$connection?.isReadOnly;
  }

  export function canResetChanges() {
    return canSave() && !!$editorValue.base;
  }

  export function save() {
    const { sql, recreates } = getAlterTableScript(
      $editorValue.base,
      extendTableInfo(fillConstraintNames($editorValue.current, driver.dialect)),
      {},
      $dbInfo,
      $dbInfo,
      driver
    );

    showModal(ConfirmSqlModal, {
      sql,
      recreates,
      onConfirm: () => {
        handleConfirmSql(sql);
      },
      engine: driver.engine,
    });
  }

  async function handleConfirmSql(sql) {
    const resp = await apiCall('database-connections/run-script', { conid, database, sql, useTransaction: true });
    const { errorMessage } = resp || {};
    if (errorMessage) {
      showModal(ErrorMessageModal, { title: 'Error when saving', message: errorMessage });
    } else {
      markTabSaved(tabid);
      await apiCall('database-connections/sync-model', { conid, database });
      showSnackbarSuccess('Saved to database');
      const isCreateTable = $editorValue?.base == null;
      const tableName = _.pick($editorValue.current, ['pureName', 'schemaName']);
      clearEditorData();
      if (isCreateTable) {
        changeTab(tabid, tab => ({
          ...tab,
          title: tableName.pureName,
          props: { ...tab.props, ...tableName },
        }));
      }
    }
  }

  export async function reset() {
    await apiCall('database-connections/sync-model', { conid, database });
    await clearEditorData();
    resetCounter++;
  }

  // $: {
  //   // if (!$editorState.isLoading && !$editorValue)
  //   if (domEditor && !pureName) domEditor.addColumn();
  // }
</script>

<ToolStripContainer>
  <TableEditor
    bind:this={domEditor}
    tableInfo={showTable}
    dbInfo={$dbInfo}
    schemaList={$schemaList}
    {driver}
    {resetCounter}
    isCreateTable={objectTypeField == 'tables' && $editorValue && !$editorValue?.base}
    setTableInfo={objectTypeField == 'tables' && !$connection?.isReadOnly && hasPermission(`dbops/model/edit`)
      ? tableInfoUpdater => {
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
          );
          markTabUnsaved(tabid);
        }
      : null}
  />
  <svelte:fragment slot="toolstrip">
    <ToolStripButton
      icon={'icon table'}
      iconAfter="icon arrow-link"
      on:click={() => {
        if (tabPreviewMode && getBoolSettingsValue('defaultAction.useLastUsedAction', true)) {
          lastUsedDefaultActions.update(actions => ({
            ...actions,
            [objectTypeField]: 'openTable',
          }));
        }

        openNewTab({
          title: pureName,
          icon: objectTypeField == 'tables' ? 'img table' : 'img view',
          tabComponent: objectTypeField == 'tables' ? 'TableDataTab' : 'ViewDataTab',
          tabPreviewMode: true,
          props: {
            schemaName,
            pureName,
            conid,
            database,
            objectTypeField,
            defaultActionId: 'openTable',
          },
        });
      }}>Data</ToolStripButton
    >

    <ToolStripButton
      icon="img sql-file"
      iconAfter="icon arrow-link"
      on:click={() => {
        if (tabPreviewMode && getBoolSettingsValue('defaultAction.useLastUsedAction', true)) {
          lastUsedDefaultActions.update(actions => ({
            ...actions,
            [objectTypeField]: 'showSql',
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
            objectTypeField,
            defaultActionId: 'showSql',
          },
        });
      }}>SQL</ToolStripButton
    >

    <ToolStripCommandButton
      command="tableStructure.save"
      buttonLabel={$editorValue?.base ? 'Alter table' : 'Create table'}
    />
    <ToolStripCommandButton command="tableStructure.reset" />
    <ToolStripCommandButton command="tableEditor.addColumn" />
    <ToolStripCommandButton command="tableEditor.addIndex" hideDisabled />
  </svelte:fragment>
</ToolStripContainer>
