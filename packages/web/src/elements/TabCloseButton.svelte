<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let unsaved = false;

  let mousein = false;
</script>

<span
  class="close-button tabCloseButton"
  on:click
  on:mouseenter={() => {
    mousein = true;
  }}
  on:mouseleave={() => {
    mousein = false;
  }}
>
  <FontIcon icon={unsaved && !mousein ? 'icon unsaved' : 'icon close'} />
</span>

<style>
  .close-button {
    margin-left: 5px;
    color: var(--theme-font-3);
  }

  .close-button:hover {
    color: var(--theme-font-1);
  }
</style>
