<script lang="ts" context="module">
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  const getCurrentEditor = () => getActiveComponent('NewRedisKeyTab');

  export const allowAddToFavorites = props => false;

  registerCommand({
    id: 'redisLikeData.saveNew',
    group: 'save',
    category: __t('command.redisLikeData', { defaultMessage: 'Redis like data' }),
    name: __t('command.redisLikeData.save', { defaultMessage: 'Save' }),
    // keyText: 'CtrlOrCommand+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.canSave(),
    onClick: () => getCurrentEditor().save(),
  });
</script>

<script lang="ts">
  import RedisValueDetail from '../redis/RedisValueDetail.svelte';
  import RedisValueHashEdit from '../redis/RedisValueHashEdit.svelte';
  import RedisValueListEdit from '../redis/RedisValueListEdit.svelte';
  import RedisValueSetEdit from '../redis/RedisValueSetEdit.svelte';
  import RedisValueZSetEdit from '../redis/RedisValueZSetEdit.svelte';
  import RedisValueStreamEdit from '../redis/RedisValueStreamEdit.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from '../forms/TextField.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import { __t, _t } from '../translations';
  import { apiCall } from '../utility/api';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import { findEngineDriver } from 'dbgate-tools';
  import { activeRedisKeysStore, getExtensions, openedTabs } from '../stores';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { showModal } from '../modals/modalTools';
  import ConfirmNoSqlModal from '../modals/ConfirmNoSqlModal.svelte';
  import { convertRedisCallListToScript } from 'dbgate-datalib';
  import registerCommand from '../commands/registerCommand';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';

  export let conid;
  export let database;
  export let tabid;
  export let initialKeyName = '';

  $: connection = useConnectionInfo({ conid });
  $: driver = $connection && findEngineDriver($connection, getExtensions());

  let item = {};
  let keyName = initialKeyName || '';
  $: type = driver?.supportedKeyTypes?.[0]?.name || '';

  export function canSave() {
    return keyName && keyName.trim() !== '';
  }

  export const activator = createActivator('NewRedisKeyTab', true);

  export async function save() {
    if (!driver) return;

    const typeConfig = driver.supportedKeyTypes.find(x => x.name == type);

    const calls = [];

    if (type === 'hash' && item.records && Array.isArray(item.records)) {
      for (const record of item.records) {
        if (record.key && record.value) {
          calls.push({
            method: typeConfig.addMethod,
            args: [keyName, record.key, record.value],
          });
        }
      }
    } else if (type === 'list' && item.records && Array.isArray(item.records)) {
      const values = item.records.map(record => record.value).filter(value => value);

      if (values.length > 0) {
        calls.push({
          method: typeConfig.addMethod,
          args: [keyName, ...values],
        });
      }
    } else if (type === 'set' && item.records && Array.isArray(item.records)) {
      const values = item.records.map(record => record.value).filter(value => value);

      if (values.length > 0) {
        calls.push({
          method: typeConfig.addMethod,
          args: [keyName, ...values],
        });
      }
    } else if (type === 'zset' && item.records && Array.isArray(item.records)) {
      for (const record of item.records) {
        if (record.member && record.score) {
          calls.push({
            method: typeConfig.addMethod,
            args: [keyName, record.member, parseFloat(record.score)],
          });
        }
      }
    } else if (type === 'stream' && item.records && Array.isArray(item.records)) {
      for (const record of item.records) {
        if (record.value) {
          const streamId = record.id || '*';
          calls.push({
            method: typeConfig.addMethod,
            args: [keyName, streamId, record.value],
          });
        }
      }
    } else {
      calls.push({
        method: typeConfig.addMethod,
        args: [keyName, ...typeConfig.dbKeyFields.map(fld => item[fld.name])],
      });
    }

    const callList = { calls };

    if (getBoolSettingsValue('skipConfirm.redisLikeDataSave', false)) {
      saveDataCore(callList);
    } else {
      showModal(ConfirmNoSqlModal, {
        script: convertRedisCallListToScript(callList),
        onConfirm: () => saveDataCore(callList),
        skipConfirmSettingKey: 'skipConfirm.redisLikeDataSave',
      });
    }
  }

  async function saveDataCore(callList) {
    const resp = await apiCall('database-connections/multi-call-method', {
      conid,
      database,
      callList,
    });
    if (resp?.errorMessage) {
      showSnackbarError(resp.errorMessage);
      return;
    }

    showSnackbarSuccess('Key created successfully');

    $activeRedisKeysStore = {
      ...$activeRedisKeysStore,
      [`${conid}:${database}`]: keyName,
    };

    await apiCall('database-connections/dispatch-redis-keys-changed', { conid, database });

    openedTabs.update(tabs =>
      tabs.map(tab => (tab.tabid === tabid ? { ...tab, closedTime: new Date().getTime(), selected: false } : tab))
    );

    openNewTab({
      tabComponent: 'RedisKeyDetailTab',
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
    <ToolStripContainer>
      <div class="container">
        <div class="flex flex-gap">
          <div class="col-9">
            <FormFieldTemplateLarge label={_t('addDbKeyModal.key', { defaultMessage: 'Key' })} type="text" noMargin>
              <TextField
                value={keyName}
                on:input={e => {
                  // @ts-ignore
                  keyName = e.target.value;
                  invalidateCommands();
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
          <RedisValueHashEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'list'}
          <RedisValueListEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'set'}
          <RedisValueSetEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'zset'}
          <RedisValueZSetEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else if type === 'stream'}
          <RedisValueStreamEdit
            dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
            {item}
            onChangeItem={value => {
              item = value;
            }}
          />
        {:else}
          <RedisValueDetail
            columnTitle="Value"
            value={item.value}
            onChangeValue={value => {
              item = { ...item, value };
            }}
          />
        {/if}
      </div>

      <svelte:fragment slot="toolstrip">
        <ToolStripCommandButton command="redisLikeData.saveNew" />
      </svelte:fragment>
    </ToolStripContainer>
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
    background-color: var(--theme-dbkey-background);
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
