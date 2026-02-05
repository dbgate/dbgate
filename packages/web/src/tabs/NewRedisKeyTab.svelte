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
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from '../forms/TextField.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import { __t, _t } from '../translations';
  import { apiCall } from '../utility/api';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import { findEngineDriver, findSupportedRedisKeyType, supportedRedisKeyTypes } from 'dbgate-tools';
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
  import RedisValueListLikeEdit from '../redis/RedisValueListLikeEdit.svelte';

  export let conid;
  export let database;
  export let tabid;
  export let initialKeyName = '';
  export let initialKeyType = 'string';

  $: connection = useConnectionInfo({ conid });
  $: driver = $connection && findEngineDriver($connection, getExtensions());

  let item: any = {
    records: [{}],
  };
  let keyName = initialKeyName || '';
  let type = initialKeyType || 'string';
  $: keyType = findSupportedRedisKeyType(type);

  export function canSave() {
    return keyName && keyName.trim() !== '';
  }

  export const activator = createActivator('NewRedisKeyTab', true);

  export async function save() {
    if (!driver) return;

    const calls = [];

    if (type === 'hash' && item.records && Array.isArray(item.records)) {
      for (const record of item.records) {
        if (record.key && record.value) {
          calls.push({
            method: 'hset',
            args: [keyName, record.key, record.value],
          });
        }
      }
    } else if (type === 'list' && item.records && Array.isArray(item.records)) {
      const values = item.records.map(record => record.value).filter(value => value);

      if (values.length > 0) {
        calls.push({
          method: 'rpush',
          args: [keyName, ...values],
        });
      }
    } else if (type === 'set' && item.records && Array.isArray(item.records)) {
      const values = item.records.map(record => record.value).filter(value => value);

      if (values.length > 0) {
        calls.push({
          method: 'sadd',
          args: [keyName, ...values],
        });
      }
    } else if (type === 'zset' && item.records && Array.isArray(item.records)) {
      for (const record of item.records) {
        if (record.member && record.score) {
          calls.push({
            method: 'zadd',
            args: [keyName, parseFloat(record.score), record.member],
          });
        }
      }
    } else if (type === 'stream' && item.records && Array.isArray(item.records)) {
      const args = [keyName, item.generatedId || '*'];
      for (const record of item.records) {
        if (record.field && record.value) {
          args.push(record.field);
          args.push(record.value);
        }
      }
      calls.push({
        method: 'xadd',
        args,
      });
    } else if (type == 'string') {
      calls.push({
        method: 'set',
        args: [keyName, item.value],
      });
    } else if (type == 'json') {
      calls.push({
        method: 'json.set',
        args: [keyName, '$', item.value],
      });
    } else {
      showSnackbarError(`Unsupported key type: ${type}`);
      return;
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

{#if driver}
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
                data-testid="NewRedisKeyTab_keyName"
              />
            </FormFieldTemplateLarge>
          </div>

          <div class="col-3">
            <FormFieldTemplateLarge label={_t('addDbKeyModal.type', { defaultMessage: 'Type' })} type="combo" noMargin>
              <SelectField
                options={supportedRedisKeyTypes.map(t => ({ value: t.name, label: t.label }))}
                value={type}
                isNative
                on:change={e => {
                  type = e.detail;
                }}
              />
            </FormFieldTemplateLarge>
          </div>
        </div>

        {#if keyType?.showGeneratedId}
          <FormFieldTemplateLarge label="ID" type="text" noMargin>
            <TextField
              placeholder="* for auto"
              value={item.generatedId}
              on:input={e => {
                item = { ...item, generatedId: e.target['value'] };
              }}
            />
          </FormFieldTemplateLarge>
        {/if}

        {#if keyType?.showItemList}
          <RedisValueListLikeEdit
            {type}
            records={item.records || []}
            onChangeRecords={value => {
              item = { ...item, records: value };
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

        {#if keyType?.showItemList}
          <ToolStripButton
            icon="icon add"
            on:click={() => {
              item = {
                ...item,
                records: [...(item.records || []), {}],
              };
            }}>Add field</ToolStripButton
          >
        {/if}
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
    background-color: var(--theme-redis-background);
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
