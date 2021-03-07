<script>
  import AceEditorCore from './AceEditorCore.svelte';

  let clientWidth;
  let clientHeight;
</script>

<div bind:clientWidth bind:clientHeight>
  <AceEditorCore {...$$props} width={clientWidth} height={clientHeight} />
</div>

<style>
  div {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
</style>
