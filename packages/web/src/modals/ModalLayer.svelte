<script>
  import { openedModals } from '../stores';
</script>

{#each $openedModals as { component, props, modalId }}
  <svelte:component this={component} {modalId} {...props} />
{/each}
