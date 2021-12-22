<script context="module" lang="ts">
  const getCurrentEditor = () => getActiveComponent('FreeTableGridCore');

  registerCommand({
    id: 'freeTableGrid.export',
    category: 'Data grid',
    name: 'Export',
    keyText: 'Ctrl+E',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().exportGrid(),
  });
</script>

<script lang="ts">
  import { createGridCache, FreeTableGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';
  import uuidv1 from 'uuid/v1';
  import registerCommand from '../commands/registerCommand';

  import DataGridCore from '../datagrid/DataGridCore.svelte';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
import { apiCall } from '../utility/api';
  import axiosInstance from '../utility/axiosInstance';
  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import FreeTableGrider from './FreeTableGrider';
  import MacroPreviewGrider from './MacroPreviewGrider';

  export let macroPreview;
  export let modelState;
  export let dispatchModel;
  export let macroValues;
  export let config;
  export let setConfig;
  export let selectedCellsPublished;

  export const activator = createActivator('FreeTableGridCore', false);

  const cache = writable(createGridCache());

  $: grider = macroPreview
    ? new MacroPreviewGrider(modelState.value, macroPreview, macroValues, selectedCellsPublished())
    : new FreeTableGrider(modelState, dispatchModel);
  $: display = new FreeTableGridDisplay(grider.model || modelState.value, config, setConfig, $cache, cache.update);

  export async function exportGrid() {
    const jslid = uuidv1();
    await apiCall('jsldata/save-free-table', { jslid, data: modelState.value });
    const initialValues: any = {};
    initialValues.sourceStorageType = 'jsldata';
    initialValues.sourceJslId = jslid;
    initialValues.sourceList = ['editor-data'];
    showModal(ImportExportModal, { initialValues: initialValues });
  }

  registerMenu({ command: 'freeTableGrid.export', tag: 'export' });
</script>

<DataGridCore {...$$props} {grider} {display} frameSelection={!!macroPreview} bind:selectedCellsPublished />
