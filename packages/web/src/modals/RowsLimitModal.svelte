<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let value;
  export let onConfirm;

  const handleSubmit = async value => {
    closeCurrentModal();
    onConfirm(value);
  };
</script>

<FormProvider initialValues={{ value }}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">{_t('query.rowsLimit', { defaultMessage: 'Rows limit' })}</svelte:fragment>

    <FormTextField
      label={_t('query.returnOnlyNRows', { defaultMessage: 'Return only N rows from query' })}
      name="value"
      focused
      data-testid="RowsLimitModal_value"
      placeholder={_t('query.noRowsLimit', { defaultMessage: '(No rows limit)' })}
    />

    <svelte:fragment slot="footer">
      <FormSubmit
        value={_t('common.ok', { defaultMessage: 'OK' })}
        on:click={e => handleSubmit(parseInt(e.detail.value) || null)}
        data-testid="RowsLimitModal_setLimit"
      />
      <FormStyledButton value={_t('common.setNoLimit', { defaultMessage: 'Set no limit' })} on:click={e => handleSubmit(null)} data-testid="RowsLimitModal_setNoLimit" />
      <FormStyledButton type="button" value={_t('common.cancel', { defaultMessage: 'Cancel' })} on:click={closeCurrentModal} data-testid="RowsLimitModal_cancel" />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
