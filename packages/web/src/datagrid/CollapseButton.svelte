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
  color: var(--theme-generic-font-grayed);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1px;
  cursor: pointer;
}

div:hover {
  color: var(--theme-generic-font);
}
</style>
