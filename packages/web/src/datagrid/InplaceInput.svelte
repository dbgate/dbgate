<script lang="ts">
  import keycodes from '../utility/keycodes';
  import { onMount } from 'svelte';
  import createRef from '../utility/createRef';
  import _ from 'lodash';
  import { parseCellValue, stringifyCellValue } from 'dbgate-tools';
  import { isCtrlOrCommandKey } from '../utility/common';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import { showModal } from '../modals/modalTools';
  import EditCellDataModal from '../modals/EditCellDataModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { _t } from '../translations';

  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetValue;
  export let width;
  export let cellValue;
  export let column = null;
  export let driver;

  export let dataEditorTypesBehaviourOverride = null;

  let domEditor;
  let showEditorButton = true;

  const widthCopy = width;

  const isChangedRef = createRef(!!inplaceEditorState.text);

  $: editorTypes = dataEditorTypesBehaviourOverride ?? driver?.dataEditorTypesBehaviour;
  $: isJsonColumn = !!column?.dataType?.match(/(^|[^a-z0-9])(jsonb?|json2?|json5)([^a-z0-9]|$)/i);

  function showJsonValidationError(err) {
    showModal(ErrorMessageModal, {
      message: `${_t('dataGrid.saveJson.invalid', {
        defaultMessage: 'JSON value is not valid and was not saved.',
      })} ${err.message}`,
    });
  }

  function getValueForSave() {
    if (editorTypes?.parseSqlNull && domEditor.value == '(NULL)') return null;

    if (isJsonColumn) {
      let parsed;
      try {
        parsed = JSON.parse(domEditor.value);
      } catch (err) {
        showJsonValidationError(err);
        return undefined;
      }

      const parsedCellValue = parseCellValue(domEditor.value, editorTypes);
      if (_.isString(parsedCellValue)) {
        return JSON.stringify(parsed);
      }
      return parsedCellValue;
    }

    return parseCellValue(domEditor.value, editorTypes);
  }

  function saveChangedValue() {
    if (!isChangedRef.get()) return true;

    const valueForSave = getValueForSave();
    if (valueForSave === undefined) return false;

    onSetValue(valueForSave);
    isChangedRef.set(false);
    return true;
  }

  function handleKeyDown(event) {
    showEditorButton = false;

    switch (event.keyCode) {
      case keycodes.escape:
        isChangedRef.set(false);
        dispatchInsplaceEditor({ type: 'close' });
        break;
      case keycodes.enter:
        if (!saveChangedValue()) return;
        domEditor.blur();
        event.preventDefault();
        dispatchInsplaceEditor({ type: 'close', mode: 'enter' });
        break;
      case keycodes.tab:
        if (!saveChangedValue()) return;
        domEditor.blur();
        event.preventDefault();
        dispatchInsplaceEditor({ type: 'close', mode: event.shiftKey ? 'shiftTab' : 'tab' });
        break;
      case keycodes.s:
        if (isCtrlOrCommandKey(event)) {
          if (!saveChangedValue()) return;
          event.preventDefault();
          dispatchInsplaceEditor({ type: 'close', mode: 'save' });
        }
        break;
    }
  }

  function handleBlur() {
    if (!saveChangedValue()) return;
    dispatchInsplaceEditor({ type: 'close' });
  }

  onMount(() => {
    domEditor.value = inplaceEditorState.text || stringifyCellValue(cellValue, 'inlineEditorIntent', editorTypes).value;
    domEditor.focus();
    if (inplaceEditorState.selectAll) {
      domEditor.select();
    }
  });

  $: realWidth = widthCopy ? widthCopy - (showEditorButton ? 16 : 0) : undefined;
</script>

<input
  type="text"
  on:change={() => {
    isChangedRef.set(true);
    showEditorButton = false;
  }}
  on:keydown={handleKeyDown}
  on:blur={handleBlur}
  bind:this={domEditor}
  style={widthCopy ? `width:${realWidth}px;min-width:${realWidth}px;max-width:${realWidth}px` : undefined}
  class:showEditorButton
/>

{#if showEditorButton}
  <ShowFormButton
    icon="icon edit"
    on:click={() => {
      isChangedRef.set(false);
      dispatchInsplaceEditor({ type: 'close' });

      showModal(EditCellDataModal, {
        value: cellValue,
        column,
        dataEditorTypesBehaviour: editorTypes,
        onSave: onSetValue,
      });
    }}
  />
{/if}

<style>
  input {
    border: 0 solid;
    outline: none;
    margin: 0;
    padding: 0 1px;
  }

  input.showEditorButton {
    margin-right: 16px;
  }
</style>
