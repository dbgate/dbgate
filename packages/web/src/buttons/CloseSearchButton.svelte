<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  import InlineButton from './InlineButton.svelte';

  export let filter;
  export let showDisabled = false;
</script>

{#if filter || showDisabled}
  <InlineButton
    on:click
    on:click={() => {
      filter = '';
    }}
    title="Clear filter"
    disabled={!filter}
  >
    <FontIcon icon="icon close" />
  </InlineButton>
{/if}
