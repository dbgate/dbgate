<script lang="ts">
  import _ from 'lodash';

  import getElectron from '../utility/getElectron';
  import hasPermission from '../utility/hasPermission';
  import localforage from 'localforage';
  import ModalBase from './ModalBase.svelte';
  import uuidv1 from 'uuid/v1';
  import { closeCurrentModal } from './modalTools';
  import { copyTextToClipboard } from '../utility/clipboard';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormButton from '../forms/FormButton.svelte';
  import { apiCall } from '../utility/api';
  import FormConnectionSelect from '../impexp/FormConnectionSelect.svelte';
  import FormDatabaseSelect from '../impexp/FormDatabaseSelect.svelte';
  import { changeTab } from '../utility/common';

  export let editingData;
  export let callingTab;

  const handleSubmit = async ev => {
    const { conid, database } = ev.detail;
    changeTab(callingTab.tabid, tab => ({
      ...tab,
      props: {
        ...tab.props,
        conid,
        database,
      },
    }));
    closeCurrentModal();
    // console.log('SwitchDatabaseModal.handleSubmit', ev);
    // changeTab(tabid, tab => ({ ...tab, busy }));
  };

  $: initialValues = {
    conid: callingTab?.props?.conid,
    database: callingTab?.props?.database,
  };
</script>

<FormProvider {initialValues}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Switch database</svelte:fragment>

    <FormConnectionSelect name="conid" label="Server" direction="source" isNative />
    <FormDatabaseSelect conidName="conid" name="database" label="Database" isNative />

    <svelte:fragment slot="footer">
      <FormValues let:values>
        <FormSubmit value="OK" on:click={handleSubmit} />
        <FormButton value="Cancel" on:click={closeCurrentModal} />
      </FormValues>
    </svelte:fragment>
  </ModalBase>
</FormProvider>
