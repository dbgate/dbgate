<script lang="ts">
  import keycodes from '../utility/keycodes';
  import { onMount, tick } from 'svelte';
  import createRef from '../utility/createRef';
  import _ from 'lodash';
  import { arrayToHexString, parseCellValue, stringifyCellValue } from 'dbgate-tools';
  import { isCtrlOrCommandKey } from '../utility/common';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import { showModal } from '../modals/modalTools';
  import EditCellDataModal from '../modals/EditCellDataModal.svelte';

  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetValue;
  export let width;
  export let cellValue;
  export let driver;

  export let dataEditorTypesBehaviourOverride = null;

  let domEditor;
  let showEditorButton = true;

  const widthCopy = width;

  const isChangedRef = createRef(!!inplaceEditorState.text);

  $: editorTypes = dataEditorTypesBehaviourOverride ?? driver?.dataEditorTypesBehaviour;

  function handleKeyDown(event) {
    showEditorButton = false;

    switch (event.keyCode) {
      case keycodes.escape:
        isChangedRef.set(false);
        dispatchInsplaceEditor({ type: 'close' });
        break;
      case keycodes.enter:
        if (isChangedRef.get()) {
          onSetValue(parseCellValue(domEditor.value, editorTypes));
          isChangedRef.set(false);
        }
        domEditor.blur();
        event.preventDefault();
        dispatchInsplaceEditor({ type: 'close', mode: 'enter' });
        break;
      case keycodes.tab:
        if (isChangedRef.get()) {
          onSetValue(parseCellValue(domEditor.value, editorTypes));
          isChangedRef.set(false);
        }
        domEditor.blur();
        event.preventDefault();
        dispatchInsplaceEditor({ type: 'close', mode: event.shiftKey ? 'shiftTab' : 'tab' });
        break;
      case keycodes.s:
        if (isCtrlOrCommandKey(event)) {
          if (isChangedRef.get()) {
            onSetValue(parseCellValue(domEditor.value, editorTypes));
            isChangedRef.set(false);
          }
          event.preventDefault();
          dispatchInsplaceEditor({ type: 'close', mode: 'save' });
        }
        break;
    }
  }

  function handleBlur() {
    if (isChangedRef.get()) {
      onSetValue(parseCellValue(domEditor.value, editorTypes));
      // grider.setCellValue(rowIndex, uniqueName, editor.value);
      isChangedRef.set(false);
    }
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
