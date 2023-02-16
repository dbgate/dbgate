<script lang="ts" context="module">
  export const matchingProps = ['archiveFile', 'archiveFolder', 'jslid'];

  const getCurrentEditor = () => getActiveComponent('ArchiveFileTab');

  registerCommand({
    id: 'archiveFile.save',
    group: 'save',
    category: 'Archive file',
    name: 'Save',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });
</script>

<script lang="ts">
  import { changeSetContainsChanges, createChangeSet } from 'dbgate-datalib';
  import { tick } from 'svelte';

  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';

  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';
  import runCommand from '../commands/runCommand';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import useEditorData from '../query/useEditorData';
  import { apiCall } from '../utility/api';
  import { markTabSaved, markTabUnsaved } from '../utility/common';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createUndoReducer from '../utility/createUndoReducer';

  export const activator = createActivator('ArchiveFileTab', true);

  export let archiveFolder = undefined;
  export let archiveFile = undefined;
  export let jslid = undefined;

  export let tabid;

  const quickExportHandlerRef = createQuickExportHandlerRef();

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

  export async function save() {
    await apiCall('archive/modify-file', {
      folder: archiveFolder,
      file: archiveFile,
      changeSet: $changeSetStore.value,
    });
    dispatchChangeSet({ type: 'reset', value: createChangeSet() });
    await tick();
    runCommand('dataGrid.refresh');
  }

  export function canSave() {
    return changeSetContainsChanges($changeSetStore?.value);
  }
</script>

<ToolStripContainer>
  <JslDataGrid
    jslid={jslid || `archive://${archiveFolder}/${archiveFile}`}
    supportsReload
    allowChangeChangeSetStructure
    changeSetState={$changeSetStore}
    focusOnVisible
    {changeSetStore}
    {dispatchChangeSet}
  />
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataGrid.refresh" />
    <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} />
    <ToolStripCommandButton command="archiveFile.save" />
  </svelte:fragment>
</ToolStripContainer>
