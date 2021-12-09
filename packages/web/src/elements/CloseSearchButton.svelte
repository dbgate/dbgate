<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  import InlineButton from './InlineButton.svelte';

  export let filter;
</script>

{#if filter}
  <InlineButton on:click={() => (filter = '')} title="Clear filter">
    <FontIcon icon="icon close" />
  </InlineButton>
{/if}
