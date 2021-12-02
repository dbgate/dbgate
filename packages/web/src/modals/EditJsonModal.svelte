<script>
  import { onMount } from 'svelte';

  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import ErrorMessageModal from './ErrorMessageModal.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';

  export let onSave;
  export let json;

  let value;

  onMount(() => {
    value = JSON.stringify(json, undefined, 2);
  });
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Edit JSON value</div>

    <div class="editor">
      <AceEditor mode="json" bind:value />
    </div>

    <div slot="footer">
      <FormStyledButton
        value="Save"
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
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
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
