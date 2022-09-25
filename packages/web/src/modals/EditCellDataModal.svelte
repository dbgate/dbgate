<script lang="ts">
  import { onMount } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import keycodes from '../utility/keycodes';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let onSave;
  export let value;

  let editor;

  let textValue = value?.toString() || '';

  onMount(() => {
    editor.getEditor().focus();
  });

  function handleKeyDown(ev) {
    if (ev.keyCode == keycodes.enter && ev.ctrlKey) {
      onSave(textValue);
      closeCurrentModal();
    }
  }
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Edit cell value</div>

    <div class="editor">
      <AceEditor bind:value={textValue} bind:this={editor} onKeyDown={handleKeyDown} />
    </div>

    <div slot="footer">
      <FormStyledButton
        value="OK"
        on:click={() => {
          onSave(textValue);
          closeCurrentModal();
        }}
      />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
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
