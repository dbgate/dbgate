<script lang="ts">
  import _ from 'lodash';
  import { writable } from 'svelte/store';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { commandsSettings } from '../stores';
  import { apiCall } from '../utility/api';
  import KeyboardModal from './KeyboardModal.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import { _t } from '../translations';

  export let command;

  let values = writable(command);

  function handleKeyboard() {
    showModal(KeyboardModal, { onChange: value => values.update(x => ({ ...x, keyText: value })) });
  }
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">{_t('commandModal.configure', { defaultMessage: 'Configure command' })}</svelte:fragment>

    <FormTextField label={_t('commandModal.category', { defaultMessage: 'Category' })} name="category" disabled />
    <FormTextField label={_t('commandModal.name', { defaultMessage: 'Name' })} name="name" disabled />

    <div class="row">
      <FormTextField label={_t('commandModal.keyboardShortcut', { defaultMessage: 'Keyboard shortcut' })} name="keyText" templateProps={{ noMargin: true }} focused />
      <FormStyledButton
        type="button"
        value={_t('commandModal.keyboard', { defaultMessage: 'Keyboard' })}
        on:click={handleKeyboard}
        data-testid="CommandModal_keyboardButton"
      />
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={e => {
          closeCurrentModal();
          apiCall('config/update-settings', {
            commands: {
              ...$commandsSettings,
              [command.id]: {
                keyText: e.detail.keyText,
                customKeyboardShortcut: true,
              },
            },
          });
        }}
      />
      <FormStyledButton
        type="button"
        value={_t('common.reset', { defaultMessage: 'Reset' })}
        on:click={() => {
          closeCurrentModal();
          apiCall('config/update-settings', {
            commands: _.omit($commandsSettings, [command.id]),
          });
        }}
      />
      <FormStyledButton type="button" value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProviderCore>

<style>
  .row {
    margin: var(--dim-large-form-margin);
  }
</style>
