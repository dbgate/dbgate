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
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import type { ChangeSetRedis, ChangeSetRedisType } from 'dbgate-datalib';

  export let tabid;
  export let conid;
  export let database;
  export let key;
  export let isDefaultBrowser = false;

  export const activator = createActivator('DbKeyDetailTab', true);
  
  export function getChangeSetRedis(): ChangeSetRedis {
    return changeSetRedis;
  }
  
  export function resetChangeSet() {
    changeSetRedis = { changes: [] };
  }

  let currentRow;

  $: key = $activeDbKeysStore[`${conid}:${database}`];
  let refreshToken = 0;
  let changeSetRedis: ChangeSetRedis = { changes: [] };
  
  $: hasChanges = changeSetRedis.changes.length > 0;

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

  function handleKeyRename(keyInfo) {
    showModal(InputTextModal, {
      value: keyInfo.key,
      label: 'New key name',
      header: `Rename key ${keyInfo.key}`,
      onConfirm: async value => {
        const res = await apiCall('database-connections/call-method', {
          conid,
          database,
          method: 'rename',
          args: [keyInfo.key, value],
        });
        
        if (res.errorMessage) {
          showModal(ErrorMessageModal, { message: res.errorMessage });
          return;
        }
        
        activeDbKeysStore.update(store => ({
          ...store,
          [`${conid}:${database}`]: value,
        }));
      },
    });
  }

  function addOrUpdateChange(change: ChangeSetRedisType) {
    const existingIndex = changeSetRedis.changes.findIndex(
      c => c.key === change.key && c.type === change.type
    );
    
    if (existingIndex >= 0) {
      changeSetRedis = {
        ...changeSetRedis,
        changes: changeSetRedis.changes.map((c, idx) => 
          idx === existingIndex ? change : c
        )
      };
    } else {
      changeSetRedis = {
        ...changeSetRedis,
        changes: [...changeSetRedis.changes, change]
      };
    }
    
    console.log('ChangeSetRedis updated:', JSON.stringify(changeSetRedis, null, 2));
  }

  function getDisplayRow(row, keyInfo) {
    if (!row) return row;
    
    const existingChange = changeSetRedis.changes.find(
      c => c.key === keyInfo.key && c.type === keyInfo.type
    );
    
    if (!existingChange) return row;
    
    if (keyInfo.type === 'hash') {
      // @ts-ignore
      const update = existingChange.updates?.find(u => u.key === row.key);
      if (update) {
        return { ...row, value: update.value };
      }
    } else if (keyInfo.type === 'list') {
      // @ts-ignore
      const update = existingChange.updates?.find(u => u.index === row.rowNumber);
      if (update) {
        return { ...row, value: update.value };
      }
    } else if (keyInfo.type === 'zset') {
      // @ts-ignore
      const update = existingChange.updates?.find(u => u.member === row.member);
      if (update) {
        return { ...row, score: update.score };
      }
    }
    
    return row;
  }

  function getDisplayValue(keyInfo) {
    const existingChange = changeSetRedis.changes.find(
      c => c.key === keyInfo.key && c.type === keyInfo.type
    );
    
    if (existingChange && (keyInfo.type === 'string' || keyInfo.type === 'json')) {
      // @ts-ignore
      return existingChange.value || keyInfo.value;
    }
    
    return keyInfo.value;
  }

  function refresh() {
    changeSetRedis = { changes: [] };
    refreshToken += 1;
  }

  async function saveAll() {
    console.log('Saving all changes:', changeSetRedis);
    await apiCall('database-connections/apply-redis-change-set', {
      conid,
      database,
      changeSet: changeSetRedis,
    });
    changeSetRedis = { changes: [] };
    refreshToken += 1;
  }
</script>

{#await apiCall('database-connections/load-key-info', { conid, database, key, refreshToken })}
  <LoadingInfo message="Loading key details" wrapper />
{:then keyInfo}
  <ToolStripContainer>
    <div class="container">
      <div class="top-panel">
        <div class="type">
          <FontIcon icon={getIconForRedisType(keyInfo.type)} padRight />
          {keyInfo.keyType?.label || keyInfo.type}
        </div>
        <div class="key-name">
          <TextField value={key} readOnly />
        </div>
        <FormStyledButton value="Rename Key" on:click={() => handleKeyRename(keyInfo)} />
        <FormStyledButton value={`TTL:${keyInfo.ttl}`} on:click={() => handleChangeTtl(keyInfo)} />
      </div>

      <div class="content">
        {#if keyInfo.keyType?.dbKeyFields && keyInfo.keyType?.showItemList}
          <VerticalSplitter>
            <svelte:fragment slot="1">
              <DbKeyTableControl
                {conid}
                {database}
                {keyInfo}
                {changeSetRedis}
                onChangeSelected={row => {
                  currentRow = row;
                }}
                modifyRow={row => getDisplayRow(row, keyInfo)}
              />
            </svelte:fragment>
            <svelte:fragment slot="2">
              <DbKeyItemDetail 
                dbKeyFields={keyInfo.keyType.dbKeyFields} 
                item={getDisplayRow(currentRow, keyInfo)}
                onChangeItem={item => {
                    const existingChange = changeSetRedis.changes.find(
                      c => c.key === keyInfo.key && c.type === keyInfo.type
                    );
                    
                    if (keyInfo.type === 'hash') {
                    // @ts-ignore
                    const hashChange = existingChange || { key: keyInfo.key, type: 'hash', inserts: [], updates: [], deletes: [] };
                    // @ts-ignore
                    const updateIndex = hashChange.updates?.findIndex(u => u.key === item.key) ?? -1;
                    if (updateIndex >= 0) {
                      // @ts-ignore
                      hashChange.updates[updateIndex] = { key: item.key, value: item.value, ttl: keyInfo.ttl };
                    } else {
                      // @ts-ignore
                      hashChange.updates = [...(hashChange.updates || []), { key: item.key, value: item.value, ttl: keyInfo.ttl }];
                    }
                    addOrUpdateChange(hashChange);
                  } else if (keyInfo.type === 'list') {
                    // @ts-ignore
                    const listChange = existingChange || { key: keyInfo.key, type: 'list', inserts: [], updates: [], deletes: [] };
                    // @ts-ignore
                    const updateIndex = listChange.updates?.findIndex(u => u.index === item.rowNumber) ?? -1;
                    if (updateIndex >= 0) {
                      // @ts-ignore
                      listChange.updates[updateIndex] = { index: item.rowNumber, value: item.value };
                    } else {
                      // @ts-ignore
                      listChange.updates = [...(listChange.updates || []), { index: item.rowNumber, value: item.value }];
                    }
                    addOrUpdateChange(listChange);
                  } else if (keyInfo.type === 'zset') {
                    // @ts-ignore
                    const zsetChange = existingChange || { key: keyInfo.key, type: 'zset', inserts: [], updates: [], deletes: [] };
                    // @ts-ignore
                    const updateIndex = zsetChange.updates?.findIndex(u => u.member === item.member) ?? -1;
                    if (updateIndex >= 0) {
                      // @ts-ignore
                      zsetChange.updates[updateIndex] = { member: item.member, score: item.score };
                    } else {
                      // @ts-ignore
                      zsetChange.updates = [...(zsetChange.updates || []), { member: item.member, score: item.score }];
                    }
                    addOrUpdateChange(zsetChange);
                  }
                }}
              />
            </svelte:fragment>
          </VerticalSplitter>
        {:else}
          <div class="value-holder">
            <DbKeyValueDetail
              columnTitle="Value"
              value={getDisplayValue(keyInfo)}
              keyType={keyInfo.type}
              onChangeValue={value => {
                if (keyInfo.type === 'string') {
                  addOrUpdateChange({
                    key: key,
                    type: 'string',
                    value: value,
                  });
                } else if (keyInfo.type === 'json') {
                  addOrUpdateChange({
                    key: key,
                    type: 'json',
                    value: value,
                  });
                }
              }}
            />
          </div>
        {/if}
      </div>
    </div>
    
    <svelte:fragment slot="toolstrip">
      <ToolStripButton
        icon="icon save"
        on:click={saveAll}
        disabled={!hasChanges}
      >{_t('common.save', { defaultMessage: 'Save' })}</ToolStripButton>
      {#if keyInfo.keyType?.addMethod && keyInfo.keyType?.showItemList}
        <ToolStripButton icon="icon add" on:click={() => addItem(keyInfo)}>Add field</ToolStripButton>
      {/if}
      <ToolStripButton icon="icon refresh" on:click={refresh}>{_t('common.refresh', { defaultMessage: 'Refresh' })}</ToolStripButton>
    </svelte:fragment>
  </ToolStripContainer>
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
