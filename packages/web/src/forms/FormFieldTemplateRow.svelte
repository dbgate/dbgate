<script lang="ts">
  export let label;
  export let labelProps: any = {};
</script>

<div class="row">
  <div class="label" {...labelProps} on:click={labelProps.onClick}>{label}</div>
  <div><slot /></div>
</div>

<style>
  .row {
    display: flex;
    margin: 10px;
  }
  .label {
    width: 10vw;
    font-weight: bold;
  }
</style>
