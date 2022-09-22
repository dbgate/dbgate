<script>
  import { onMount } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import AceEditor from '../query/AceEditor.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let onSave;
  export let value;

  let editor;

  onMount(() => {
    editor.getEditor().focus();
  });
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Edit cell value</div>

    <div class="editor">
      <AceEditor bind:value bind:this={editor} />
    </div>

    <div slot="footer">
      <FormStyledButton
        value="Save"
        on:click={() => {
          onSave(value);
          closeCurrentModal();
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
