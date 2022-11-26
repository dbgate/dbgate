<script lang="ts">
  import { onMount } from 'svelte';

  export let value;
  export let focused = false;
  export let domEditor = undefined;
  export let autocomplete = 'new-password';

  if (focused) onMount(() => domEditor.focus());
</script>

<input
  type="text"
  {...$$restProps}
  bind:value
  on:change
  on:input
  on:click
  bind:this={domEditor}
  on:keydown
  {autocomplete}
/>
