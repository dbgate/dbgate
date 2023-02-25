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
  import localforage from 'localforage';
  import { onMount, tick } from 'svelte';

  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';

  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';
  import runCommand from '../commands/runCommand';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import { showModal } from '../modals/modalTools';
  import SaveArchiveModal from '../modals/SaveArchiveModal.svelte';
  import useEditorData from '../query/useEditorData';
  import { apiCall } from '../utility/api';
  import { changeTab, markTabSaved, markTabUnsaved, sleep } from '../utility/common';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createUndoReducer from '../utility/createUndoReducer';

  export const activator = createActivator('ArchiveFileTab', true);

  export let archiveFolder = undefined;
  export let archiveFile = undefined;
  export let jslid = undefined;

  export let tabid;
  let infoLoadCounter = 0;
  let jslidChecked = false;

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

  async function saveAs() {
    showModal(SaveArchiveModal, {
      onSave: doSaveAs,
    });
  }

  const doSaveAs = async (folder, file) => {
    await apiCall('archive/save-jsl-data', {
      folder,
      file,
      jslid,
      changeSet: changeSetContainsChanges($changeSetStore?.value) ? $changeSetStore.value : null,
    });
    changeTab(tabid, tab => ({
      ...tab,
      title: file,
      props: { archiveFile: file, archiveFolder: folder },
      archiveFile: file,
      archiveFolder: folder,
    }));

    if (changeSetContainsChanges($changeSetStore?.value)) {
      await sleep(100);
      afterSaveChangeSet();
    }
  };

  async function afterSaveChangeSet() {
    const structureChanged = !!$changeSetStore.value?.structure;
    dispatchChangeSet({ type: 'reset', value: createChangeSet() });
    if (structureChanged) {
      infoLoadCounter += 1;
    }
    await tick();
    runCommand('dataGrid.refresh');
  }

  export async function save() {
    if (jslid) {
      saveAs();
    } else {
      await apiCall('archive/modify-file', {
        folder: archiveFolder,
        file: archiveFile,
        changeSet: $changeSetStore.value,
      });
      await afterSaveChangeSet();
    }
  }

  export function canSave() {
    return jslid || changeSetContainsChanges($changeSetStore?.value);
  }

  async function checkJslid() {
    if (jslid) {
      if (!(await apiCall('jsldata/exists', { jslid }))) {
        const rows = await localforage.getItem(`tabdata_rows_${tabid}`);
        if (rows) {
          await apiCall('jsldata/save-rows', { jslid, rows });
        }
      }
    }
    jslidChecked = true;
  }

  onMount(() => {
    checkJslid();
  });
</script>

<ToolStripContainer>
  {#if jslidChecked || !jslid}
    <JslDataGrid
      jslid={jslid || `archive://${archiveFolder}/${archiveFile}`}
      supportsReload
      allowChangeChangeSetStructure
      changeSetState={$changeSetStore}
      focusOnVisible
      {changeSetStore}
      {dispatchChangeSet}
      {infoLoadCounter}
    />
  {/if}
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataGrid.refresh" />
    <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} />
    <ToolStripCommandButton command="archiveFile.save" />
  </svelte:fragment>
</ToolStripContainer>
