<script>
  import FontIcon from './FontIcon.svelte';

  export let isBlank = false;
  export let isExpanded = false;
</script>

{#if isBlank}
  <FontIcon icon="icon invisible-box" {...$$props} />
{:else}
  <FontIcon icon={isExpanded ? 'icon minus-box' : 'icon plus-box'} {...$$props} />
{/if}
