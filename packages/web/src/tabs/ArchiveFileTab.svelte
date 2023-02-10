<script lang="ts" context="module">
  export const matchingProps = ['archiveFile', 'archiveFolder', 'jslid'];
</script>

<script lang="ts">
  import { changeSetContainsChanges, createChangeSet } from 'dbgate-datalib';

  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';

  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import useEditorData from '../query/useEditorData';
  import { markTabSaved, markTabUnsaved } from '../utility/common';
  import createUndoReducer from '../utility/createUndoReducer';

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
</script>

<ToolStripContainer>
  <JslDataGrid
    jslid={jslid || `archive://${archiveFolder}/${archiveFile}`}
    supportsReload
    changeSetState={$changeSetStore}
    {changeSetStore}
    {dispatchChangeSet}
  />
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataGrid.refresh" />
    <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} />
  </svelte:fragment>
</ToolStripContainer>
