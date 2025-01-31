<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let collapsed;
  export let vertical = false;
</script>

<div on:click|stopPropagation class="collapseButtonMarker" {...$$restProps}>
  <FontIcon
    icon={collapsed
      ? vertical
        ? 'icon triple-down'
        : 'icon triple-right'
      : vertical
        ? 'icon triple-up'
        : 'icon triple-left'}
  />
</div>

<style>
  div {
    color: var(--theme-font-3);
    text-align: center;
    /* position: absolute;
    left: 0px;
    top: 4px;
    background-color: var(--theme-bg-1);
    border: 1px solid var(--theme-bg-1); */
    margin: 1px;
  }

  div:hover {
    color: var(--theme-font-hover);
    border: 1px solid var(--theme-font-1);
    margin: 0px;
  }
</style>
