<script lang="ts">
  import { onMount } from 'svelte';

  export let rootNode;
  export let onLoadNext;

  let domObserved;

  function handleObserver(entries) {
    // // console.log('HANDLE OBSERVER', loadedRows.length);
    // if (isLoading || loadedRows.length == 0) return;
    // loadNextData();
    const [entry] = entries;

    if (entry.isIntersecting) {
      onLoadNext();
    }
  }

  onMount(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: rootNode,
      rootMargin: '100px',
      threshold: 0.1,
    });
    observer.observe(domObserved);
    return () => {
      observer.disconnect();
    };
  });
</script>

<div bind:this={domObserved}>... data to be loaded</div>
