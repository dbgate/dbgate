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
</script>

<td class="editor">
  <div class="inplaceeditor-container">
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
</style>
