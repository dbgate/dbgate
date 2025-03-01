<script lang="ts" context="module">
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  const getCurrentEditor = () => getActiveComponent('DbKeyDetailTab');

  export const matchingProps = ['conid', 'database', 'isDefaultBrowser'];
  export const allowAddToFavorites = props => false;

  function getKeyText(key) {
    if (!key) return '(no name)';
    const keySplit = key.split(':');
    if (keySplit.length > 1) return keySplit[keySplit.length - 1];
    return key || '(no name)';
  }
</script>

<script lang="ts">
  import { activeDbKeysStore } from '../stores';
  import { apiCall } from '../utility/api';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { getIconForRedisType } from 'dbgate-tools';
  import TextField from '../forms/TextField.svelte';
  import DbKeyTableControl from '../datagrid/DbKeyTableControl.svelte';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import _ from 'lodash';
  import DbKeyItemDetail from '../dbkeyvalue/DbKeyItemDetail.svelte';
  import DbKeyAddItemModal from '../modals/DbKeyAddItemModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { changeTab } from '../utility/common';
  import SelectField from '../forms/SelectField.svelte';
  import DbKeyValueDetail from '../dbkeyvalue/DbKeyValueDetail.svelte';
  import { _t } from '../translations';

  export let tabid;
  export let conid;
  export let database;
  export let key;
  export let isDefaultBrowser = false;

  export const activator = createActivator('DbKeyDetailTab', true);

  let currentRow;

  $: key = $activeDbKeysStore[`${conid}:${database}`];
  let refreshToken = 0;
  let editedValue = null;

  $: changeTab(tabid, tab => ({
    ...tab,
    title: getKeyText(key),
  }));

  function handleChangeTtl(keyInfo) {
    showModal(InputTextModal, {
      value: keyInfo.ttl,
      label: 'New TTL value (-1=key never expires)',
      header: `Set TTL for key ${keyInfo.key}`,
      onConfirm: async value => {
        const ttl = parseInt(value);
        if (_.isNumber(ttl)) {
          if (ttl < 0) {
            await apiCall('database-connections/call-method', {
              conid,
              database,
              method: 'persist',
              args: [keyInfo.key],
            });
          } else {
            await apiCall('database-connections/call-method', {
              conid,
              database,
              method: 'expire',
              args: [keyInfo.key, ttl],
            });
          }
          refresh();
        }
      },
    });
  }

  function refresh() {
    editedValue = null;
    refreshToken += 1;
  }

  async function saveString() {
    await apiCall('database-connections/call-method', {
      conid,
      database,
      method: 'set',
      args: [key, editedValue],
    });
    refresh();
  }

  async function addItem(keyInfo) {
    showModal(DbKeyAddItemModal, {
      keyInfo,
      onConfirm: async row => {
        const res = await apiCall('database-connections/call-method', {
          conid,
          database,
          method: keyInfo.keyType.addMethod,
          args: [keyInfo.key, ...keyInfo.keyType.dbKeyFields.map(col => row[col.name])],
        });
        if (res.errorMessage) {
          showModal(ErrorMessageModal, { message: res.errorMessage });
          return false;
        }
        refresh();
        return true;
      },
    });
  }
</script>

{#await apiCall('database-connections/load-key-info', { conid, database, key, refreshToken })}
  <LoadingInfo message="Loading key details" wrapper />
{:then keyInfo}
  <div class="container">
    <div class="top-panel">
      <div class="type">
        <FontIcon icon={getIconForRedisType(keyInfo.type)} padRight />
        {keyInfo.type}
      </div>
      <div class="key-name">
        <TextField value={key} readOnly />
      </div>
      <FormStyledButton value={`TTL:${keyInfo.ttl}`} on:click={() => handleChangeTtl(keyInfo)} />
      {#if keyInfo.type == 'string'}
        <FormStyledButton
          value={_t('common.save', { defaultMessage: 'Save' })}
          on:click={saveString}
          disabled={!editedValue}
        />
      {/if}
      {#if keyInfo.keyType?.addMethod && keyInfo.keyType?.showItemList}
        <FormStyledButton value="Add item" on:click={() => addItem(keyInfo)} />
      {/if}
      <FormStyledButton value={_t('common.refresh', { defaultMessage: 'Refresh' })} on:click={refresh} />
    </div>

    <div class="content">
      {#if keyInfo.keyType?.dbKeyFields && keyInfo.keyType?.showItemList}
        <VerticalSplitter>
          <svelte:fragment slot="1">
            <DbKeyTableControl
              {conid}
              {database}
              {keyInfo}
              onChangeSelected={row => {
                currentRow = row;
              }}
            />
          </svelte:fragment>
          <svelte:fragment slot="2">
            <DbKeyItemDetail dbKeyFields={keyInfo.keyType.dbKeyFields} item={currentRow} />
          </svelte:fragment>
        </VerticalSplitter>
      {:else}
        <div class="value-holder">
          <DbKeyValueDetail
            columnTitle="Value"
            value={editedValue || keyInfo.value}
            onChangeValue={value => {
              editedValue = value;
            }}
          />
        </div>
      {/if}
    </div>
  </div>
{/await}

<style>
  .container {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .content {
    flex: 1;
    position: relative;
  }

  .top-panel {
    display: flex;
    background: var(--theme-bg-2);
  }

  .type {
    font-weight: bold;
    margin-right: 10px;
    align-self: center;
  }

  .key-name {
    flex-grow: 1;
    display: flex;
  }

  .key-name :global(input) {
    flex-grow: 1;
  }

  .value-holder {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;

    display: flex;
    flex-direction: column;
  }
</style>
