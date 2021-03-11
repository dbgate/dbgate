<script lang="ts">
  import WidgetTitle from './WidgetTitle.svelte';

  export let title;
  export let name;
  export let height = null;
  export let collapsed = null;

  let visible = !collapsed;
</script>

<WidgetTitle on:click={() => (visible = !visible)}>{title}</WidgetTitle>

{#if visible}
  <slot />
{/if}
