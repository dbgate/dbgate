<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let tabs;
  export let onConfirm;
  export let onCancel;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Confirm close tabs</svelte:fragment>

    <div>
      Following files are modified, really close tabs? After closing, you could reopen them in history
      <FontIcon icon="icon history" />
      widget
    </div>

    {#each tabs as tab}
      <div class="ml-2"><FontIcon icon={tab.icon} /> {tab.title}</div>
    {/each}

    <svelte:fragment slot="footer">
      <FormSubmit
        value="Close tabs"
        on:click={() => {
          closeCurrentModal();
          onConfirm();
        }}
      />
      <FormStyledButton
        type="button"
        value="Cancel"
        on:click={() => {
          closeCurrentModal();
          onCancel();
        }}
      />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
