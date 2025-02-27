<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import ChangeDownloadUrlModal from '../modals/ChangeDownloadUrlModal.svelte';
  import { showModal } from '../modals/modalTools';

  export let name;
  const { values, setFieldValue } = getFormContext();

  const handleDelete = () => {
    setFieldValue(
      'sourceList',
      $values.sourceList.filter(x => x != name)
    );
  };
  const doChangeUrl = url => {
    setFieldValue(`sourceFile_${name}`, { fileName: url, isDownload: true });
  };
  const handleChangeUrl = () => {
    showModal(ChangeDownloadUrlModal, { url: obj.fileName, onConfirm: doChangeUrl });
  };

  $: obj = $values[`sourceFile_${name}`];
</script>

<div class="flex space-between">
  <div>{name == '__TEMPLATE__' ? '(not selected)' : name}</div>
  <div class="flex">
    {#if obj && !!obj.isDownload}
      <div class="icon" on:click={handleChangeUrl} title={obj && obj.fileName}>
        <FontIcon icon="icon web" />
      </div>
    {/if}
    <div class="icon" on:click={handleDelete}>
      <FontIcon icon="icon delete" />
    </div>
  </div>
</div>

<style>
  .icon {
    cursor: pointer;
    color: var(--theme-font-link);
    margin-left: 5px;
  }
  .icon:hover {
    background-color: var(--theme-bg-2);
  }
</style>
