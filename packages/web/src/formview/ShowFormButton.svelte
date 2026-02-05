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
    color: var(--theme-generic-font-grayed);
    background-color: var(--theme-toolstrip-button-background-active);
    border: var(--theme-toolstrip-button-border);
  }

  .secondary {
    margin-right: 20px;
  }

  div:hover {
    color: var(--theme-generic-font);
    top: 1px;
    right: 0px;
    cursor: pointer;
  }
</style>
