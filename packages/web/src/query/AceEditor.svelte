<script>
  import AceEditorCore from './AceEditorCore.svelte';

  let clientWidth;
  let clientHeight;
</script>

<div bind:clientWidth bind:clientHeight class="ace-container">
  <AceEditorCore {...$$props} width={clientWidth} height={clientHeight} />
</div>

<style>
  .ace-container {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
</style>
