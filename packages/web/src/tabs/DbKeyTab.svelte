<script lang="ts">
  import DbKeyValueDetail from '../dbkeyvalue/DbKeyValueDetail.svelte';
  import DbKeyValueHashEdit from '../dbkeyvalue/DbKeyValueHashEdit.svelte';
  import DbKeyValueListEdit from '../dbkeyvalue/DbKeyValueListEdit.svelte';
  import DbKeyValueSetEdit from '../dbkeyvalue/DbKeyValueSetEdit.svelte';
  import DbKeyValueZSetEdit from '../dbkeyvalue/DbKeyValueZSetEdit.svelte';
  import DbKeyValueStreamEdit from '../dbkeyvalue/DbKeyValueStreamEdit.svelte';
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
  export let initialKeyName = '';

  $: connection = useConnectionInfo({ conid });
  $: driver = $connection && findEngineDriver($connection, getExtensions());

  let item = {};
  let keyName = initialKeyName || '';
  $: type = driver?.supportedKeyTypes?.[0]?.name || '';

  $: console.log('DbKeyTab debug:', { conid, database, connection: $connection, driver, hasTypes: driver?.supportedKeyTypes?.length });

  async function handleSave() {
    if (!driver) return;
    
    const typeConfig = driver.supportedKeyTypes.find(x => x.name == type);
    
    if (type === 'hash' && item.records && Array.isArray(item.records)) {
      for (const record of item.records) {
        if (record.key && record.value) {
          await apiCall('database-connections/call-method', {
            conid,
            database,
            method: typeConfig.addMethod,
            args: [keyName, record.key, record.value],
          });
        }
      }
    } else if (type === 'list' && item.records && Array.isArray(item.records)) {
      const values = item.records
        .map(record => record.value)
        .filter(value => value);
      
      if (values.length > 0) {
        await apiCall('database-connections/call-method', {
          conid,
          database,
          method: typeConfig.addMethod,
          args: [keyName, ...values],
        });
      }
    } else if (type === 'set' && item.records && Array.isArray(item.records)) {
      const values = item.records
        .map(record => record.value)
        .filter(value => value);
      
      if (values.length > 0) {
        await apiCall('database-connections/call-method', {
          conid,
          database,
          method: typeConfig.addMethod,
          args: [keyName, ...values],
        });
      }
    } else if (type === 'zset' && item.records && Array.isArray(item.records)) {
      const pairs = [];
      item.records.forEach(record => {
        if (record.member && record.score) {
          pairs.push(record.score, record.member);
        }
      });
      
      if (pairs.length > 0) {
        await apiCall('database-connections/call-method', {
          conid,
          database,
          method: typeConfig.addMethod,
          args: [keyName, ...pairs],
        });
      }
    } else if (type === 'stream' && item.records && Array.isArray(item.records)) {
      for (const record of item.records) {
        if (record.value) {
          const streamId = record.id || '*';
          await apiCall('database-connections/call-method', {
            conid,
            database,
            method: typeConfig.addMethod,
            args: [keyName, streamId, record.value],
          });
        }
      }
    } else {
      await apiCall('database-connections/call-method', {
        conid,
        database,
        method: typeConfig.addMethod,
        args: [keyName, ...typeConfig.dbKeyFields.map(fld => item[fld.name])],
      });
    }

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
        <div class="flex flex-gap">
          <div class="col-9">
            <FormFieldTemplateLarge label={_t('addDbKeyModal.key', { defaultMessage: 'Key' })} type="text" noMargin>
              <TextField
                value={keyName}
                on:change={e => {
                  // @ts-ignore
                  keyName = e.target.value;
                }}
              />
            </FormFieldTemplateLarge>
          </div>

          <div class="col-3">
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
          </div>
        </div>

        {#if type === 'hash'}
          <DbKeyValueHashEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'list'}
          <DbKeyValueListEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'set'}
          <DbKeyValueSetEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'zset'}
          <DbKeyValueZSetEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'stream'}
          <DbKeyValueStreamEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else}
          <DbKeyValueDetail
            columnTitle="Value"
            value={item.value}
            onChangeValue={value => {
              item = { ...item, value };
            }}
          />
        {/if}

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
    gap: 10px;
  }

  .button-container {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .flex-gap {
    gap: 10px;
    padding-bottom: 10px;
  }
</style>