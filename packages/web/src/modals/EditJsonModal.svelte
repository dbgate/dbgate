<script>
  import { onMount } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import ErrorMessageModal from './ErrorMessageModal.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import { _t } from '../translations';

  export let onSave;
  export let json;
  export let showPasteInfo;

  let value;
  let editor;

  onMount(() => {
    if (json) {
      value = JSON.stringify(json, undefined, 2);
    } else {
      // editor.getEditor().execCommand('paste');
    }
    editor.getEditor().focus();
  });
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Edit JSON value</div>
    {#if showPasteInfo}
      <div class="m-2">
        Edit JSON object or array. You can paste JSON array or object directly into data grid, new row(s) will be added
        to recordset.
      </div>
    {/if}

    <div class="editor">
      <AceEditor mode="json" bind:value bind:this={editor} />
    </div>

    <div slot="footer">
      <FormStyledButton
        value={_t('common.save', { defaultMessage: 'Save' })}
        data-testid="EditJsonModal_saveButton"
        on:click={() => {
          try {
            const parsed = JSON.parse(value);
            if (onSave(parsed)) {
              closeCurrentModal();
            }
          } catch (err) {
            showModal(ErrorMessageModal, { message: err.message });
            return;
          }
        }}
      />
      <FormStyledButton
        type="button"
        value="Close"
        on:click={closeCurrentModal}
        data-testid="EditJsonModal_closeButton"
      />
    </div>
  </ModalBase>
</FormProvider>

<style>
  .editor {
    position: relative;
    height: 30vh;
    width: 40vw;
  }
</style>
