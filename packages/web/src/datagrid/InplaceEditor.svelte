<script lang="ts" context="module">
  function getEditedValue(value) {
    if (value?.type == 'Buffer' && _.isArray(value.data)) return arrayToHexString(value.data);
    if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value);
    return value;
  }

  function getStoredValue(originalValue, newString) {
    if (originalValue?.type == 'Buffer' && _.isArray(originalValue?.data)) {
      return {
        type: 'Buffer',
        data: hexStringToArray(newString),
      };
    }
    return newString;
  }
</script>

<script lang="ts">
  import keycodes from '../utility/keycodes';
  import { onMount } from 'svelte';
  import createRef from '../utility/createRef';
  import _ from 'lodash';
  import { arrayToHexString, hexStringToArray } from 'dbgate-tools';

  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetValue;
  export let width;
  export let cellValue;

  let domEditor;

  const widthCopy = width;

  const isChangedRef = createRef(!!inplaceEditorState.text);

  function handleKeyDown(event) {
    switch (event.keyCode) {
      case keycodes.escape:
        isChangedRef.set(false);
        dispatchInsplaceEditor({ type: 'close' });
        break;
      case keycodes.enter:
        if (isChangedRef.get()) {
          // grider.setCellValue(rowIndex, uniqueName, editor.value);
          onSetValue(getStoredValue(cellValue, domEditor.value));
          isChangedRef.set(false);
        }
        domEditor.blur();
        dispatchInsplaceEditor({ type: 'close', mode: 'enter' });
        break;
      case keycodes.s:
        if (event.ctrlKey) {
          if (isChangedRef.get()) {
            onSetValue(getStoredValue(cellValue, domEditor.value));
            // grider.setCellValue(rowIndex, uniqueName, editor.value);
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
      onSetValue(getStoredValue(cellValue, domEditor.value));
      // grider.setCellValue(rowIndex, uniqueName, editor.value);
      isChangedRef.set(false);
    }
    dispatchInsplaceEditor({ type: 'close' });
  }

  onMount(() => {
    domEditor.value = inplaceEditorState.text || getEditedValue(cellValue);
    domEditor.focus();
    if (inplaceEditorState.selectAll) {
      domEditor.select();
    }
  });
</script>

<input
  type="text"
  on:change={() => isChangedRef.set(true)}
  on:keydown={handleKeyDown}
  on:blur={handleBlur}
  bind:this={domEditor}
  style={widthCopy ? `width:${widthCopy}px;min-width:${widthCopy}px;max-width:${widthCopy}px` : undefined}
/>

<style>
  input {
    border: 0px solid;
    outline: none;
    margin: 0px;
    padding: 0px;
  }
</style>
