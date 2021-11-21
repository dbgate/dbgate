<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let collapsed;
</script>

<div on:click|stopPropagation class="collapseButtonMarker">
  <FontIcon icon={collapsed ? 'icon triple-right' : 'icon triple-left'} />
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
  }

  div:hover {
    color: var(--theme-font-hover);
    border: 1px solid var(--theme-font-1);
  }
</style>
