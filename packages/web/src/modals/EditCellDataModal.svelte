<script lang="ts">
  import { onMount } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import keycodes from '../utility/keycodes';
  import _ from 'lodash';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import SelectField from '../forms/SelectField.svelte';
  import { parseCellValue, safeJsonParse, stringifyCellValue } from 'dbgate-tools';
  import { showSnackbarError } from '../utility/snackbar';
  import ErrorMessageModal from './ErrorMessageModal.svelte';
  
  export let onSave;
  export let value;

  export let dataEditorTypesBehaviour;

  let editor;
  let syntaxMode = 'text';

  let textValue = stringifyCellValue(value, 'multilineEditorIntent', dataEditorTypesBehaviour).value;

  onMount(() => {
    editor.getEditor().focus();
    if (safeJsonParse(textValue)) syntaxMode = 'json';
    if (textValue.match(/<\/[a-zA-z0-9-]+\s*>/)) {
      // end tag
      if (textValue.match(/<\/(div|span|h[0-6]|p|input|a)\s*>/)) {
        syntaxMode = 'html';
      } else {
        syntaxMode = 'xml';
      }
    }
  });

  function handleKeyDown(ev) {
    if (ev.keyCode == keycodes.enter && ev.ctrlKey) {
      onSave(parseCellValue(textValue, dataEditorTypesBehaviour));
      closeCurrentModal();
    }
  }

  function handleFormatJson() {
    const parsed = safeJsonParse(textValue);
    if (parsed) {
      textValue = JSON.stringify(parsed, null, 2);
    } else {
      showModal(ErrorMessageModal, { message: 'Not valid JSON' });
    }
  }
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Edit cell value</div>

    <div class="editor">
      <AceEditor bind:value={textValue} bind:this={editor} onKeyDown={handleKeyDown} mode={syntaxMode} />
    </div>

    <div slot="footer" class="footer">
      <div>
        <FormStyledButton
          value="OK"
          title="Ctrl+Enter"
          on:click={() => {
            onSave(parseCellValue(textValue, dataEditorTypesBehaviour));
            closeCurrentModal();
          }}
        />
        <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
      </div>

      <div>
        <FormStyledButton type="button" value="Format JSON" on:click={handleFormatJson} />

        Code highlighting:
        <SelectField
          isNative
          value={syntaxMode}
          on:change={e => (syntaxMode = e.detail)}
          options={[
            { value: 'text', label: 'None (raw text)' },
            { value: 'json', label: 'JSON' },
            { value: 'html', label: 'HTML' },
            { value: 'xml', label: 'XML' },
          ]}
        />
      </div>
    </div>
  </ModalBase>
</FormProvider>

<style>
  .editor {
    position: relative;
    height: 30vh;
    width: 40vw;
  }

  .footer {
    display: flex;
    justify-content: space-between;
  }
</style>
