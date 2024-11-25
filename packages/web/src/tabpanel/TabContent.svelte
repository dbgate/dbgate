<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  export let tabid;
  export let tabVisible;
  export let tabFocused;
  export let tabPreviewMode;
  export let tabComponent;

  setContext('tabid', tabid);

  const tabVisibleStore = writable(tabVisible);
  setContext('tabVisible', tabVisibleStore);
  $: tabVisibleStore.set(tabVisible);

  const tabFocusedStore = writable(tabFocused);
  setContext('tabFocused', tabFocusedStore);
  $: tabFocusedStore.set(tabFocused);
</script>

<div class:tabVisible>
  <svelte:component this={tabComponent} {...$$restProps} {tabid} {tabVisible} {tabFocused} {tabPreviewMode} />
</div>

<style>
  div {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
  }
  .tabVisible {
    visibility: visible;
  }
  :not(.tabVisible) {
    visibility: hidden;
  }
</style>
