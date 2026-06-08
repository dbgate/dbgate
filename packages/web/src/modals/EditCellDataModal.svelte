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
  import ErrorMessageModal from './ErrorMessageModal.svelte';
  import { _t } from '../translations';
  
  export let onSave;
  export let value;
  export let column = null;

  export let dataEditorTypesBehaviour;

  let editor;
  let syntaxMode = 'text';

  let textValue = stringifyCellValue(value, 'multilineEditorIntent', dataEditorTypesBehaviour).value;

  $: isJsonColumn = !!column?.dataType?.match(/(^|[^a-z0-9])(jsonb?|json2?|json5)([^a-z0-9]|$)/i);

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
      saveValue();
    }
  }

  function parseJsonForFormatting() {
    let parsed;
    try {
      parsed = JSON.parse(textValue);
    } catch (err) {
      showModal(ErrorMessageModal, { message: _t('dataGrid.formatJson.invalid', { defaultMessage: 'Not valid JSON' }) });
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

  function showJsonValidationError(err) {
    showModal(ErrorMessageModal, {
      message: `${_t('dataGrid.saveJson.invalid', {
        defaultMessage: 'JSON value is not valid and was not saved.',
      })} ${err.message}`,
    });
  }

  function getValueForSave() {
    if (dataEditorTypesBehaviour?.parseSqlNull && textValue == '(NULL)') return null;

    if (isJsonColumn) {
      try {
        JSON.parse(textValue);
      } catch (err) {
        showJsonValidationError(err);
        return undefined;
      }

      const parsedCellValue = parseCellValue(textValue, dataEditorTypesBehaviour);
      if (_.isString(parsedCellValue)) {
        return textValue;
      }
      return parsedCellValue;
    }

    return parseCellValue(textValue, dataEditorTypesBehaviour);
  }

  function saveValue() {
    const valueForSave = getValueForSave();
    if (valueForSave === undefined) return;

    onSave(valueForSave);
    closeCurrentModal();
  }
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">{_t('dataGrid.editCellValue', { defaultMessage: 'Edit cell value' })}</div>

    <div class="editor">
      <AceEditor bind:value={textValue} bind:this={editor} onKeyDown={handleKeyDown} mode={syntaxMode} />
    </div>

    <div slot="footer" class="footer">
      <div>
        <FormStyledButton
          value={_t('common.ok', { defaultMessage: 'OK' })}
          title="Ctrl+Enter"
          on:click={saveValue}
        />
        <FormStyledButton type="button" value={_t('common.cancel', { defaultMessage: 'Cancel' })} on:click={closeCurrentModal} />
      </div>

      <div>
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

        {_t('dataGrid.codeHighlighting', { defaultMessage: 'Code highlighting:' })}
        <SelectField
          isNative
          value={syntaxMode}
          on:change={e => (syntaxMode = e.detail)}
          options={[
            { value: 'text', label: _t('dataGrid.codeHighlighting.none', { defaultMessage: 'None (raw text)' }) },
            { value: 'json', label: 'JSON' },
            { value: 'html', label: 'HTML'},
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
