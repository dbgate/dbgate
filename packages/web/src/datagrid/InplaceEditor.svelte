<script lang="ts">
  import keycodes from '../utility/keycodes';
  import { onMount } from 'svelte';

  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetValue;
  export let width;
  export let cellValue;

  let domEditor;

  const widthCopy = width;

  const isChangedRef = { current: !!inplaceEditorState.text };

  function handleKeyDown(event) {
    switch (event.keyCode) {
      case keycodes.escape:
        isChangedRef.current = false;
        dispatchInsplaceEditor({ type: 'close' });
        break;
      case keycodes.enter:
        if (isChangedRef.current) {
          // grider.setCellValue(rowIndex, uniqueName, editor.value);
          onSetValue(domEditor.value);
          isChangedRef.current = false;
        }
        domEditor.blur();
        dispatchInsplaceEditor({ type: 'close', mode: 'enter' });
        break;
      case keycodes.s:
        if (event.ctrlKey) {
          if (isChangedRef.current) {
            onSetValue(domEditor.value);
            // grider.setCellValue(rowIndex, uniqueName, editor.value);
            isChangedRef.current = false;
          }
          event.preventDefault();
          dispatchInsplaceEditor({ type: 'close', mode: 'save' });
        }
        break;
    }
  }

  function handleBlur() {
    if (isChangedRef.current) {
      onSetValue(domEditor.value);
      // grider.setCellValue(rowIndex, uniqueName, editor.value);
      isChangedRef.current = false;
    }
    dispatchInsplaceEditor({ type: 'close' });
  }

  onMount(() => {
    domEditor.value = inplaceEditorState.text || cellValue;
    domEditor.focus();
    if (inplaceEditorState.selectAll) {
      domEditor.select();
    }
  });
</script>

<input
  type="text"
  on:change={() => (isChangedRef.current = true)}
  on:keydown={handleKeyDown}
  on:blur={handleBlur}
  bind:this={domEditor}
  style={`width:${widthCopy}px;min-width:${widthCopy}px;max-width:${widthCopy}px`}
/>

<style>
  input {
    border: 0px solid;
    outline: none;
    margin: 0px;
    padding: 0px;
  }
</style>
