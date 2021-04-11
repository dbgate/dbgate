<script lang="ts">
  import _ from 'lodash';
  import { writable } from 'svelte/store';

  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import InlineButton from '../elements/InlineButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { customKeyboardShortcuts } from '../stores';
  import KeyboardModal from './KeyboardModal.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';

  export let command;

  let values = writable(command);

  function handleKeyboard() {
    showModal(KeyboardModal, { onChange: value => values.update(x => ({ ...x, keyText: value })) });
  }
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Configure commmand</svelte:fragment>

    <FormTextField label="Category" name="category" disabled />
    <FormTextField label="Name" name="name" disabled />

    <div class="row">
      <FormTextField label="Keyboard shortcut" name="keyText" templateProps={{ noMargin: true }} focused />
      <FormStyledButton type="button" value="Keyboard" on:click={handleKeyboard} />
    </div>

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
</FormProviderCore>

<style>
  .row {
    margin: var(--dim-large-form-margin);
  }
</style>
