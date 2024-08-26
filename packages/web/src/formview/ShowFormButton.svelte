<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let icon = 'icon form';
  export let secondary = false;
</script>

<div
  on:click|stopPropagation|preventDefault
  on:mousedown|stopPropagation|preventDefault
  on:mouseup|stopPropagation|preventDefault
  class="showFormButtonMarker"
  class:secondary
>
  <FontIcon {icon} />
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

  .secondary {
    margin-right: 20px;
  }

  div:hover {
    color: var(--theme-font-hover);
    border: var(--theme-border);
    top: 1px;
    right: 0px;
  }
</style>
