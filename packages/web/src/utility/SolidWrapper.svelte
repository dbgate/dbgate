<script>
  import { onMount, onDestroy } from 'svelte';
  import { render } from 'solid-js/web';

  let container;

  let solidDispose;

  export let component;
  export let passProps = {};

  onMount(() => {
    solidDispose = render(() => component(passProps), container);
  });

  onDestroy(() => {
    if (solidDispose) solidDispose();
  });
</script>

<div bind:this={container}></div>
