<script lang="ts">
  import InplaceInput from './InplaceInput.svelte';
  import InplaceSelect from './InplaceSelect.svelte';

  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetValue;
  export let width;
  export let cellValue;
  export let options;
  export let canSelectMultipleOptions;
  export let driver;
  export let dataEditorTypesBehaviourOverride = null;
  export let rowHeight = null;

  $: fixedHeightStyle = rowHeight > 0 ? `height:${rowHeight}px; line-height:${rowHeight}px;` : undefined;
</script>

<td class="editor" class:fixedHeight={rowHeight > 0} style={fixedHeightStyle}>
  <div class="inplaceeditor-container" class:fixedHeightContent={rowHeight > 0} style={fixedHeightStyle}>
    {#if options}
      <InplaceSelect
        {inplaceEditorState}
        {dispatchInsplaceEditor}
        {cellValue}
        {onSetValue}
        {options}
        {canSelectMultipleOptions}
        {driver}
        {dataEditorTypesBehaviourOverride}
      />
    {:else}
      <InplaceInput
        {width}
        {inplaceEditorState}
        {dispatchInsplaceEditor}
        {cellValue}
        {onSetValue}
        {driver}
        {dataEditorTypesBehaviourOverride}
      />
    {/if}
  </div>
</td>

<style>
  td.editor {
    position: relative;
  }

  td.editor.fixedHeight {
    box-sizing: border-box;
    overflow: hidden;
    padding: 0;
  }

  .inplaceeditor-container.fixedHeightContent {
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    white-space: nowrap;
  }
</style>
