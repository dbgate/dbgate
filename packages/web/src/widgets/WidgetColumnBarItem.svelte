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
  <div>
    <slot />
  </div>
{/if}

<style>
  div {
    overflow: hidden;
    position: relative;
    flex-direction: column;
    display: flex;
    min-height: 100px;
  }
</style>
