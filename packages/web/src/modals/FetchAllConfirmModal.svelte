<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import TemplatedCheckboxField from '../forms/TemplatedCheckboxField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { apiCall } from '../utility/api';
  import { _t } from '../translations';

  export let onConfirm;

  const SKIP_SETTING_KEY = 'dataGrid.skipFetchAllConfirm';

  let dontAskAgain = false;
</script>

<FormProvider>
  <ModalBase {...$$restProps} data-testid="FetchAllConfirmModal">
    <svelte:fragment slot="header">
      {_t('datagrid.fetchAll.title', { defaultMessage: 'Fetch All Rows' })}
    </svelte:fragment>

    <div class="message">
      <FontIcon icon="img warn" />
      <span>
        {_t('datagrid.fetchAll.warning', {
          defaultMessage:
            'This will load all remaining rows into memory. For large tables, this may consume a significant amount of memory and could affect application performance.',
        })}
      </span>
    </div>

    <div class="mt-2">
      <TemplatedCheckboxField
        label={_t('common.dontAskAgain', { defaultMessage: "Don't ask again" })}
        templateProps={{ noMargin: true }}
        checked={dontAskAgain}
        on:change={e => {
          dontAskAgain = e.detail;
          apiCall('config/update-settings', { [SKIP_SETTING_KEY]: e.detail });
        }}
        data-testid="FetchAllConfirmModal_dontAskAgain"
      />
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit
        value={_t('datagrid.fetchAll.confirm', { defaultMessage: 'Fetch All' })}
        on:click={() => {
          closeCurrentModal();
          onConfirm();
        }}
        data-testid="FetchAllConfirmModal_okButton"
      />
      <FormStyledButton
        type="button"
        value={_t('common.close', { defaultMessage: 'Close' })}
        on:click={closeCurrentModal}
        data-testid="FetchAllConfirmModal_closeButton"
      />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.5;
  }
</style>
