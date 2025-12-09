<script lang="ts">
  import DbKeyItemDetail from '../dbkeyvalue/DbKeyItemDetail.svelte';
  import FormFieldTemplateLarge from "../forms/FormFieldTemplateLarge.svelte";
  import FormProvider from '../forms/FormProvider.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from "../forms/TextField.svelte";
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { _t } from '../translations';
  import { apiCall } from '../utility/api';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import { findEngineDriver } from 'dbgate-tools';
  import { activeDbKeysStore, getExtensions, openedTabs } from '../stores';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';

  export let conid;
  export let database;
  export let tabid;

  $: connection = useConnectionInfo({ conid });
  $: driver = $connection && findEngineDriver($connection, getExtensions());

  let item = {};
  let keyName = '';
  $: type = driver?.supportedKeyTypes?.[0]?.name || '';

  $: console.log('DbKeyTab debug:', { conid, database, connection: $connection, driver, hasTypes: driver?.supportedKeyTypes?.length });

  async function handleSave() {
    if (!driver) return;
    
    const typeConfig = driver.supportedKeyTypes.find(x => x.name == type);
    
    await apiCall('database-connections/call-method', {
      conid,
      database,
      method: typeConfig.addMethod,
      args: [keyName, ...typeConfig.dbKeyFields.map(fld => item[fld.name])],
    });

    showSnackbarSuccess('Key created successfully');

    $activeDbKeysStore = {
      ...$activeDbKeysStore,
      [`${conid}:${database}`]: keyName,
    };

    openedTabs.update(tabs => 
      tabs.map(tab => 
        tab.tabid === tabid 
          ? { ...tab, closedTime: new Date().getTime(), selected: false }
          : tab
      )
    );

    openNewTab({
      tabComponent: 'DbKeyDetailTab',
      title: keyName || '(no name)',
      icon: 'img keydb',
      props: {
        isDefaultBrowser: true,
        conid,
        database,
      },
    });
  }
</script>

{#if driver && driver.supportedKeyTypes && driver.supportedKeyTypes.length > 0}
  <FormProvider>
    <div class="wrapper">
      <div class="container">
        <FormFieldTemplateLarge label={_t('addDbKeyModal.key', { defaultMessage: 'Key' })} type="text" noMargin>
          <TextField
            value={keyName}
            on:change={e => {
              // @ts-ignore
              keyName = e.target.value;
            }}
          />
        </FormFieldTemplateLarge>

        <div class="m-3" />

        <FormFieldTemplateLarge label={_t('addDbKeyModal.type', { defaultMessage: 'Type' })} type="combo" noMargin>
          <SelectField
            options={driver.supportedKeyTypes.map(t => ({ value: t.name, label: t.label }))}
            value={type}
            isNative
            on:change={e => {
              type = e.detail;
            }}
          />
        </FormFieldTemplateLarge>

        <DbKeyItemDetail
          dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
          {item}
          onChangeItem={value => {
            item = value;
          }}
        />

        <div class="m-3" />

        <div class="button-container">
          <FormStyledButton 
            value={_t('common.save', { defaultMessage: 'Save' })} 
            on:click={handleSave}
            disabled={!keyName || keyName.trim() === ''}
          />
        </div>
      </div>
    </div>
  </FormProvider>
{:else}
  <div class="wrapper">
    <div class="container">
      <div class="loading">Loading...</div>
    </div>
  </div>
{/if}

<style>
  .wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow: hidden;
  }

  .button-container {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
</style>