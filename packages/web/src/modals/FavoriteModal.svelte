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
  import { _t } from '../translations';

  export let editingData;
  export let savingTab;

  const electron = getElectron();
  const savedProperties = ['title', 'icon', 'openOnStartup', 'urlPath'];
  $: initialValues = savingTab
    ? {
        title: savingTab.title,
        icon: savingTab.icon,
        urlPath: _.kebabCase(_.deburr(savingTab.title)),
      }
    : editingData
      ? _.pick(editingData, savedProperties)
      : {};

  $: savedFile = savingTab && savingTab.props && savingTab.props.savedFile;

  const canWriteFavorite = hasPermission('files/favorites/write');

  const getTabSaveData = async values => {
    const tabdata = {};
    const skipEditor = !!savedFile && values.whatToSave != 'content';

    const re = new RegExp(`tabdata_(.*)_${savingTab.tabid}`);
    for (const key of await localforage.keys()) {
      const match = key.match(re);
      if (!match) continue;
      if (skipEditor && match[1] == 'editor') continue;
      tabdata[match[1]] = await localforage.getItem(key);
    }
    for (const key in localStorage) {
      const match = key.match(re);
      if (!match) continue;
      if (skipEditor && match[1] == 'editor') continue;
      tabdata[match[1]] = JSON.parse(localStorage.getItem(key));
    }
    console.log('tabdata', tabdata, skipEditor, savingTab.tabid);

    return {
      props:
        values.whatToSave == 'content' && savingTab.props
          ? _.omit(savingTab.props, ['savedFile', 'savedFormat', 'savedFolder'])
          : savingTab.props,
      tabComponent: savingTab.tabComponent,
      tabdata,
      ..._.pick(values, savedProperties),
    };
  };

  const saveTab = async values => {
    const data = await getTabSaveData(values);

    apiCall('files/save', {
      folder: 'favorites',
      file: uuidv1(),
      format: 'json',
      data,
    });
  };

  const saveFile = async values => {
    const oldDataResp = await apiCall('files/load', {
      folder: 'favorites',
      file: editingData.file,
      format: 'json',
    });

    apiCall('files/save', {
      folder: 'favorites',
      file: editingData.file,
      format: 'json',
      data: {
        ...oldDataResp,
        ...values,
      },
    });
  };

  const handleSubmit = async ev => {
    closeCurrentModal();
    if (savingTab) {
      saveTab(ev.detail);
    }
    if (editingData) {
      saveFile(ev.detail);
    }
  };

  const handleCopyLink = async ev => {
    const tabdata = await getTabSaveData(ev.detail);
    copyTextToClipboard(`${document.location.origin}#tabdata=${encodeURIComponent(JSON.stringify(tabdata))}`);
  };
</script>

<FormProvider {initialValues}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">{editingData ? _t('favorite.editFavorite', { defaultMessage: 'Edit favorite' }) : _t('favorite.shareAddToFavorites', { defaultMessage: 'Share / add to favorites' })}</svelte:fragment>

    <FormTextField label={_t('favorite.title', { defaultMessage: 'Title' })} name="title" focused />
    <FormTextField label={_t('favorite.icon', { defaultMessage: 'Icon' })} name="icon" />

    <FormTextField label={_t('favorite.urlPath', { defaultMessage: 'URL path' })} name="urlPath" />
    {#if !!savingTab && !electron && canWriteFavorite}
      <FormCheckboxField label={_t('favorite.shareAsLink', { defaultMessage: 'Share as link' })} name="shareAsLink" />
    {/if}
    <FormValues let:values>
      {#if !values.shareAsLink && canWriteFavorite}
        <FormCheckboxField label={_t('favorite.openOnStartup', { defaultMessage: 'Open on startup' })} name="openOnStartup" />
      {/if}
    </FormValues>
    {#if !!savingTab && !!savedFile}
      <FormSelectField
        label={_t('favorite.whatToSave', { defaultMessage: 'What to save' })}
        name="whatToSave"
        options={[
          { label: _t('favorite.linkToFile', { defaultMessage: 'Link to file' }), value: 'fileName' },
          { label: _t('favorite.content', { defaultMessage: 'Content' }), value: 'content' },
        ]}
      />
    {/if}

    <svelte:fragment slot="footer">
      <FormValues let:values>
        {#if !values.shareAsLink && canWriteFavorite}
          <FormSubmit value={_t('common.ok', { defaultMessage: 'OK' })} on:click={handleSubmit} />
        {/if}
        {#if values.shareAsLink || !canWriteFavorite}
          <FormButton value={_t('common.copyLink', { defaultMessage: 'Copy link' })} on:click={handleCopyLink} />
        {/if}
        <FormButton value={_t('common.cancel', { defaultMessage: 'Cancel' })} on:click={closeCurrentModal} />
      </FormValues>
    </svelte:fragment>
  </ModalBase>
</FormProvider>
