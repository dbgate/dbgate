<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let collapsed;
</script>

<div on:click|stopPropagation class='collapseButtonMarker'>
  <FontIcon icon={collapsed ? 'icon triple-right' : 'icon triple-left'} />
</div>

<style>
  div {
    position: absolute;
    left: 0px;
    top: 4px;
    color: var(--theme-font-3);
    background-color: var(--theme-bg-1);
    border: 1px solid var(--theme-bg-1);
  }

  div:hover {
    color: var(--theme-font-hover);
    border: var(--theme-border);
    top: 4px;
  }
</style>
