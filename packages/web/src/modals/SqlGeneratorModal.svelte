<script lang="ts">
  import LargeButton from '../elements/LargeButton.svelte';

  import FontIcon from '../icons/FontIcon.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let conid;
  export let database;

  let busy = false;
</script>

<ModalBase {...$$restProps} fullScreen>
  <svelte:fragment slot="header">
    SQL Generator
    {#if busy}
      <FontIcon icon="icon loading" />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="footer">
    <div class="flex m-2">
      <LargeButton on:click={closeCurrentModal} icon="icon close">Close</LargeButton>
    </div>
  </svelte:fragment>
</ModalBase>
