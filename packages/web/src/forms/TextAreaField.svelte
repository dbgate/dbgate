<script lang="ts">
  import { onMount } from 'svelte';

  export let value;
  export let focused = false;

  let domEditor;

  if (focused) onMount(() => domEditor.focus());
</script>

<textarea {...$$restProps} bind:value on:change on:input bind:this={domEditor} />
