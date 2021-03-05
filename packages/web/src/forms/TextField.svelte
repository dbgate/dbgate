<script lang="ts">
  import { onMount } from 'svelte';

  export let value;
  export let focused;

  let domEditor;

  if (focused) onMount(() => domEditor.focus());
</script>

<input type="text" {...$$restProps} bind:value on:change on:input bind:this={domEditor} />
