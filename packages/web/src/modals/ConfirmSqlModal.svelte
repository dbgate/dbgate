<script>
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let sql;
  export let onConfirm;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Save changes</div>

    <textarea class="editor" value={sql} />

    <div slot="footer">
      <FormSubmit
        value="OK"
        on:click={() => {
          closeCurrentModal();
          onConfirm();
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
