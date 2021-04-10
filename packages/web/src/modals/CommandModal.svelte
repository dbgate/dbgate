<script lang="ts">
  import _ from 'lodash';

  import FormStyledButton from '../elements/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { customKeyboardShortcuts } from '../stores';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let command;
</script>

<FormProvider initialValues={command}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Configure commmand</svelte:fragment>

    <FormTextField label="Category" name="category" disabled />
    <FormTextField label="Name" name="name" disabled />
    <FormTextField label="Keyboard shortcut" name="keyText" />

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={e => {
          closeCurrentModal();
          customKeyboardShortcuts.update(list => ({
            ...list,
            [command.id]: {
              keyText: e.detail.keyText,
              customKeyboardShortcut: true,
            },
          }));
        }}
      />
      <FormStyledButton
        type="button"
        value="Reset"
        on:click={() => {
          closeCurrentModal();
          customKeyboardShortcuts.update(list => _.omit(list, [command.id]));
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
