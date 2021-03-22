<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
</script>

<div on:click|stopPropagation>
  <FontIcon icon="icon form" />
</div>

<style>
  div {
    position: absolute;
    right: 0px;
    top: 1px;
    color: var(--theme-font-3);
    background-color: var(--theme-bg-1);
    border: 1px solid var(--theme-bg-1);
  }

  div:hover {
    color: var(--theme-font-hover);
    border: var(--theme-border);
    top: 1px;
    right: 0px;
  }
</style>
