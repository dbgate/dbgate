<script lang="ts">
  export let noMargin = false;
</script>

<div class:noMargin><slot /></div>

<style>
  div {
    display: flex;
    border-bottom: 1px solid var(--theme-border);
    margin-bottom: 5px;
  }

  div.noMargin {
    margin-bottom: 0;
  }
</style>
