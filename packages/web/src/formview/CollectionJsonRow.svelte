<script lang="ts" context="module">
  export function editJsonRowDocument(grider, rowIndex) {
    const rowData = grider.getRowData(rowIndex);
    showModal(EditJsonModal, {
      json: rowData,
      onSave: value => {
        if (
          grider.getRowStatus(rowIndex).status != 'inserted' &&
          rowData._id &&
          stableStringify(value._id) != stableStringify(rowData._id)
        ) {
          showModal(ErrorMessageModal, { message: '_id attribute cannot be changed' });
          return false;
        }
        grider.setRowData(rowIndex, value);
        return true;
      },
    });
  }
</script>

<script lang="ts">
  import JSONTree from '../jsontree/JSONTree.svelte';
  import EditJsonModal from '../modals/EditJsonModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { copyTextToClipboard } from '../utility/clipboard';
  import { getContextMenu, registerMenu } from '../utility/contextMenu';
  import stableStringify from 'json-stable-stringify';

  export let rowIndex;
  export let grider;

  export let expandAll = false;
  let expandKey = 0;

  $: rowData = grider.getRowData(rowIndex);
  $: rowStatus = grider.getRowStatus(rowIndex);

  function handleEditDocument() {
    editJsonRowDocument(grider, rowIndex);
  }

  function handleCopyJsonDocument() {
    const rowData = grider.getRowData(rowIndex);
    copyTextToClipboard(JSON.stringify(rowData, undefined, 2));
  }

  function handleExpandDocument() {
    expandAll = true;
    expandKey += 1;
  }

  registerMenu([
    { text: 'Copy JSON document', onClick: handleCopyJsonDocument },
    { text: 'Edit document', onClick: handleEditDocument },
    { text: 'Delete document', onClick: () => grider.deleteRow(rowIndex) },
    { text: 'Revert row changes', onClick: () => grider.revertRowChanges(rowIndex) },
    { text: 'Expand document', onClick: handleExpandDocument },
  ]);
</script>

{#key expandKey}
  <JSONTree
    value={rowData}
    labelOverride="({rowIndex + 1}) "
    isModified={rowStatus.status == 'updated'}
    isInserted={rowStatus.status == 'inserted'}
    isDeleted={rowStatus.status == 'deleted'}
    {expandAll}
  />
{/key}
