<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormCloudFolderSelect from '../forms/FormCloudFolderSelect.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import { useCloudContentList } from '../utility/metadataLoaders';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let message = '';
  export let onConfirm;
  export let requiredRoleVariants;

  const cloudContentList = useCloudContentList();
</script>

{#if $cloudContentList}
  <FormProvider initialValues={{ cloudFolder: $cloudContentList?.find(x => x.isPrivate)?.folid }}>
    <ModalBase {...$$restProps}>
      <svelte:fragment slot="header">{_t('cloudFolderModal.chooseCloudFolder', { defaultMessage: 'Choose cloud folder' })}</svelte:fragment>

      <div>{message}</div>

      <FormCloudFolderSelect label={_t('cloudFolderModal.cloudFolder', { defaultMessage: 'Cloud folder' })} name="cloudFolder" isNative {requiredRoleVariants} />
      <svelte:fragment slot="footer">
        <FormSubmit
          value={_t('common.ok', { defaultMessage: 'OK' })}
          on:click={e => {
            closeCurrentModal();
            console.log('onConfirm', e.detail);
            onConfirm(e.detail.cloudFolder);
          }}
        />
        <FormStyledButton type="button" value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
      </svelte:fragment>
    </ModalBase>
  </FormProvider>
{/if}
