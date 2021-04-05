<script>
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import AceEditor from '../query/AceEditor.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let onSave;
  export let value;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Edit JSON value</div>

    <div class="editor">
      <AceEditor mode="json" bind:value />
    </div>

    <div slot="footer">
      <FormSubmit
        value="Save"
        on:click={() => {
          if (onSave(value)) {
            closeCurrentModal();
          }
        }}
      />
      <FormStyledButton type="button" value="Close" onClick={closeCurrentModal} />
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
