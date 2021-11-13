<script lang="ts">
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import DefineDictionaryDescriptionModal from './DefineDictionaryDescriptionModal.svelte';

  export let onConfirm;
  export let conid;
  export let database;
  export let pureName;
  export let schemaName;

  function defineDescription() {
    showModal(DefineDictionaryDescriptionModal, {
      conid,
      database,
      schemaName,
      pureName,
      onConfirm: () => reload(),
    });
  }

  function reload() {}
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Lookup from {pureName}</svelte:fragment>

    {pureName}

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={() => {
          closeCurrentModal();
          onConfirm();
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      <FormStyledButton type="button" value="Customize" on:click={defineDescription} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
