<script>
  import { onMount, onDestroy } from "svelte";
  import { render } from "solid-js/web";
  import MySolidComponent from "./MySolidComponent.jsx"; // If using same bundler

  let container;

  let solidDispose;

  onMount(() => {
    solidDispose = render(MySolidComponent, container);
  });

  onDestroy(() => {
    if (solidDispose) solidDispose();
  });
</script>

<div bind:this={container}></div>