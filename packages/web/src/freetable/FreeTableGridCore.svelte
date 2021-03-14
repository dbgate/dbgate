<script lang="ts">
  import { createGridCache, FreeTableGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';
  import uuidv1 from 'uuid/v1';

  import DataGridCore from '../datagrid/DataGridCore.svelte';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import axiosInstance from '../utility/axiosInstance';
  import FreeTableGrider from './FreeTableGrider';
  import MacroPreviewGrider from './MacroPreviewGrider';

  export let macroPreview;
  export let modelState;
  export let dispatchModel;
  export let macroValues;
  export let config;
  export let setConfig;

  let selectedCells = [];
  const cache = writable(createGridCache());

  $: grider = macroPreview
    ? new MacroPreviewGrider(modelState.value, macroPreview, macroValues, selectedCells)
    : new FreeTableGrider(modelState, dispatchModel);
  $: display = new FreeTableGridDisplay(grider.model || modelState.value, config, setConfig, $cache, cache.update);

  async function exportGrid() {
    const jslid = uuidv1();
    await axiosInstance.post('jsldata/save-free-table', { jslid, data: modelState.value });
    const initialValues: any = {};
    initialValues.sourceStorageType = 'jsldata';
    initialValues.sourceJslId = jslid;
    initialValues.sourceList = ['editor-data'];
    showModal(ImportExportModal, { initialValues: initialValues });
  }
</script>

<DataGridCore {...$$props} {grider} {display} frameSelection={!!macroPreview} {exportGrid} onExportGrid={exportGrid} />
