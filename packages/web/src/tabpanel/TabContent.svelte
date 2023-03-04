<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  export let tabid;
  export let tabVisible;
  export let tabComponent;

  const tabVisibleStore = writable(tabVisible);
  setContext('tabid', tabid);
  setContext('tabVisible', tabVisibleStore);

  $: tabVisibleStore.set(tabVisible);
</script>

<div class:tabVisible>
  <svelte:component this={tabComponent} {...$$restProps} {tabid} {tabVisible} />
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
