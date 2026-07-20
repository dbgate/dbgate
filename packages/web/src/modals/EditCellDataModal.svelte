<script lang="ts">
  import { onMount } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import keycodes from '../utility/keycodes';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import SelectField from '../forms/SelectField.svelte';
  import { parseCellValue, safeJsonParse, stringifyCellValue, hexStringToArray } from 'dbgate-tools';
  import ErrorMessageModal from './ErrorMessageModal.svelte';
  import { _t } from '../translations';

  export let onSave;
  export let value;

  export let dataEditorTypesBehaviour;

  let editor;
  let syntaxMode = 'text';
  let decodeMode = '';
  let showDecode = false;

  let textValue = stringifyCellValue(value, 'multilineEditorIntent', dataEditorTypesBehaviour).value;
  const originalHexValue = textValue;

  onMount(() => {
    editor.getEditor().focus();
    showDecode = textValue.startsWith('0x') && !textValue.includes('\n');
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
      saveValue();
    }
  }

  function parseJsonForFormatting() {
    let parsed;
    try {
      parsed = JSON.parse(textValue);
    } catch (err) {
      showModal(ErrorMessageModal, {
        message: _t('dataGrid.formatJson.invalid', { defaultMessage: 'Not valid JSON' }),
      });
      return;
    }
    return parsed;
  }

  function handleFormatJson() {
    const parsed = parseJsonForFormatting();
    if (parsed === undefined) return;

    textValue = JSON.stringify(parsed, null, 2);
  }

  function handleMinifyJson() {
    const parsed = parseJsonForFormatting();
    if (parsed === undefined) return;

    textValue = JSON.stringify(parsed);
  }

  function saveValue() {
    onSave(parseCellValue(textValue, dataEditorTypesBehaviour));
    closeCurrentModal();
  }
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">{_t('dataGrid.editCellValue', { defaultMessage: 'Edit cell value' })}</div>

    <div class="editor-tools">
      {#if showDecode}
        <label class="editor-tool-field">
          <span>{_t('dataGrid.decode', { defaultMessage: 'Decode:' })}</span>
          <SelectField
            isNative
            data-testid="EditCellDataModal_decodeMode"
            value={decodeMode}
            on:change={e => {
              decodeMode = e.detail;
              textValue = decodeMode
                ? new TextDecoder(decodeMode).decode(
                    Uint8Array.from(hexStringToArray(originalHexValue.slice(2)))
                  )
                : originalHexValue;
            }}
            options={[
              { value: '', label: '' },
              { value: 'utf-8', label: 'UTF-8' },
              { value: 'iso-8859-1', label: 'ISO-8859-1' },
              { value: 'iso-8859-2', label: 'ISO-8859-2' },
              { value: 'cp1250', label: 'Windows-1250' },
              { value: 'cp1251', label: 'Windows-1251' },
              { value: 'cp1252', label: 'Windows-1252' },
              { value: 'cp1253', label: 'Windows-1253' },
            ]}
          />
        </label>
      {/if}

      <label class="editor-tool-field">
        <span>{_t('dataGrid.codeHighlighting', { defaultMessage: 'Code highlighting:' })}</span>
        <SelectField
          isNative
          value={syntaxMode}
          on:change={e => (syntaxMode = e.detail)}
          options={[
            { value: 'text', label: _t('dataGrid.codeHighlighting.none', { defaultMessage: 'None (raw text)' }) },
            { value: 'json', label: 'JSON' },
            { value: 'html', label: 'HTML' },
            { value: 'xml', label: 'XML' },
          ]}
        />
      </label>

      <div class="editor-tool-buttons">
        <FormStyledButton
          type="button"
          skipWidth={true}
          value={_t('dataGrid.formatJson', { defaultMessage: 'Format JSON' })}
          on:click={handleFormatJson}
        />
        <FormStyledButton
          type="button"
          skipWidth={true}
          value={_t('dataGrid.minifyJson', { defaultMessage: 'Minify JSON' })}
          on:click={handleMinifyJson}
        />
      </div>
    </div>

    <div class="editor">
      <AceEditor bind:value={textValue} bind:this={editor} onKeyDown={handleKeyDown} mode={syntaxMode} />
    </div>

    <div slot="footer" class="footer">
      <div class="footer-actions">
        <FormStyledButton value={_t('common.ok', { defaultMessage: 'OK' })} title="Ctrl+Enter" on:click={saveValue} />
        <FormStyledButton
          type="button"
          value={_t('common.cancel', { defaultMessage: 'Cancel' })}
          on:click={closeCurrentModal}
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

  .editor-tools {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    margin-right: -15px;
    margin-bottom: 10px;
    margin-left: -15px;
    padding-right: 15px;
    padding-bottom: 10px;
    padding-left: 15px;
    border-bottom: var(--theme-modal-border);
  }

  .editor-tool-buttons {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .editor-tool-field {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .editor-tools :global(select) {
    box-sizing: border-box;
    height: 32px;
    padding: 5px 8px;
  }
</style>
