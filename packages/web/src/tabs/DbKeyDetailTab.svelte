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

  registerCommand({
    id: 'redisLikeData.save',
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
  import { activeDbKeysStore, extensions } from '../stores';
  import { apiCall } from '../utility/api';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FontIcon, { getNumberIcon } from '../icons/FontIcon.svelte';
  import { findEngineDriver, getIconForRedisType } from 'dbgate-tools';
  import TextField from '../forms/TextField.svelte';
  import DbKeyTableControl from '../datagrid/DbKeyTableControl.svelte';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import _ from 'lodash';
  import DbKeyItemDetail from '../dbkeyvalue/DbKeyItemDetail.svelte';
  import DbKeyValueHashDetail from '../dbkeyvalue/DbKeyValueHashDetail.svelte';
  import DbKeyValueZSetDetail from '../dbkeyvalue/DbKeyValueZSetDetail.svelte';
  import DbKeyValueStreamDetail from '../dbkeyvalue/DbKeyValueStreamDetail.svelte';
  import DbKeyValueListEdit from '../dbkeyvalue/DbKeyValueListEdit.svelte';
  import DbKeyValueHashEdit from '../dbkeyvalue/DbKeyValueHashEdit.svelte';
  import DbKeyValueZSetEdit from '../dbkeyvalue/DbKeyValueZSetEdit.svelte';
  import DbKeyValueSetEdit from '../dbkeyvalue/DbKeyValueSetEdit.svelte';
  import DbKeyValueStreamEdit from '../dbkeyvalue/DbKeyValueStreamEdit.svelte';
  import DbKeyAddItemModal from '../modals/DbKeyAddItemModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { changeTab } from '../utility/common';
  import SelectField from '../forms/SelectField.svelte';
  import DbKeyValueDetail from '../dbkeyvalue/DbKeyValueDetail.svelte';
  import { __t, _t } from '../translations';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import { convertRedisCallListToScript, type ChangeSetRedis, type ChangeSetRedisType } from 'dbgate-datalib';
  import useEditorData from '../query/useEditorData';
  import { onDestroy } from 'svelte';
  import ToolStripDropDownButton from '../buttons/ToolStripDropDownButton.svelte';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import ConfirmNoSqlModal from '../modals/ConfirmNoSqlModal.svelte';
  import { showSnackbarError } from '../utility/snackbar';
  import registerCommand from '../commands/registerCommand';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';

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
  let showAddForm = false;
  let previousKey = null;
  $: connection = useConnectionInfo({ conid });

  $: key = $activeDbKeysStore[`${conid}:${database}`];
  let refreshToken = 0;

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      if (value && value.changes) {
        changeSetRedis = value;
      }
    },
  });

  let changeSetRedis: ChangeSetRedis = { changes: [] };

  $: if ($editorValue && $editorValue.changes) {
    changeSetRedis = $editorValue;
  }

  $: {
    changeSetRedis;
    invalidateCommands();
  }

  $: if (changeSetRedis && changeSetRedis.changes) {
    setEditorData(changeSetRedis);
  }

  $: if (key !== previousKey && previousKey !== null && changeSetRedis.changes.length > 0) {
    setEditorData(changeSetRedis);
    previousKey = key;
  } else if (key !== previousKey) {
    previousKey = key;
  }

  $: hasChanges = changeSetRedis.changes.length > 0;

  $: changeTab(tabid, tab => ({
    ...tab,
    title: getKeyText(key),
  }));

  onDestroy(() => {
    if (changeSetRedis && changeSetRedis.changes && changeSetRedis.changes.length > 0) {
      setEditorData(changeSetRedis);
    }
  });

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
    const existingIndex = changeSetRedis.changes.findIndex(c => c.key === change.key && c.type === change.type);

    if (existingIndex >= 0) {
      changeSetRedis = {
        ...changeSetRedis,
        changes: changeSetRedis.changes.map((c, idx) => (idx === existingIndex ? change : c)),
      };
    } else {
      changeSetRedis = {
        ...changeSetRedis,
        changes: [...changeSetRedis.changes, change],
      };
    }
  }

  function getDisplayRow(row, keyInfo) {
    if (!row) return row;

    const existingChange = changeSetRedis.changes.find(c => c.key === keyInfo.key && c.type === keyInfo.type);

    if (!existingChange) return row;

    if (keyInfo.type === 'hash') {
      // @ts-ignore
      const originalKey = row._originalKey || row.key;
      const update = existingChange.updates?.find(u => u.originalKey === originalKey);
      if (update) {
        return {
          ...row,
          _originalKey: originalKey,
          key: update.key,
          value: update.value,
          TTL: update.ttl !== undefined ? update.ttl : row.TTL,
        };
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
    const existingChange = changeSetRedis.changes.find(c => c.key === keyInfo.key && c.type === keyInfo.type);

    if (existingChange && (keyInfo.type === 'string' || keyInfo.type === 'JSON')) {
      // @ts-ignore
      return existingChange.value || keyInfo.value;
    }

    return keyInfo.value;
  }

  function getExistingInserts(keyInfo) {
    const existingChange = changeSetRedis.changes.find(c => c.key === keyInfo.key && c.type === keyInfo.type);

    let records = [];

    // Add existing inserts if any
    if (existingChange && existingChange.inserts) {
      // @ts-ignore
      records = existingChange.inserts.map(insert => {
        if (keyInfo.type === 'hash') {
          return { key: insert.key || '', value: insert.value || '', ttl: insert.ttl ? String(insert.ttl) : '' };
        } else if (keyInfo.type === 'list' || keyInfo.type === 'set') {
          return { value: insert.value || '' };
        } else if (keyInfo.type === 'zset') {
          return { member: insert.member || '', score: insert.score ? String(insert.score) : '' };
        } else if (keyInfo.type === 'stream') {
          return { id: insert.id || '', value: insert.value || '' };
        }
        return insert;
      });
    }

    if (records.length === 0) {
      if (keyInfo.type === 'hash') {
        records.push({ key: '', value: '', ttl: '' });
      } else if (keyInfo.type === 'list' || keyInfo.type === 'set') {
        records.push({ value: '' });
      } else if (keyInfo.type === 'zset') {
        records.push({ member: '', score: '' });
      } else if (keyInfo.type === 'stream') {
        records.push({ id: '', value: '' });
      }
    }

    return { records };
  }

  function handleRemoveItem(row, keyInfo) {
    const existingChange = changeSetRedis.changes.find(c => c.key === keyInfo.key && c.type === keyInfo.type);

    let change;
    if (existingChange) {
      change = { ...existingChange };
    } else {
      // @ts-ignore
      change = { key: keyInfo.key, type: keyInfo.type, inserts: [], updates: [], deletes: [] };
    }

    // Add the item to the deletes array based on the type
    if (keyInfo.type === 'hash') {
      // @ts-ignore
      change.deletes = [...(change.deletes || []), row.key];
    } else if (keyInfo.type === 'set') {
      // @ts-ignore
      change.deletes = [...(change.deletes || []), row.value];
    } else if (keyInfo.type === 'zset') {
      // @ts-ignore
      change.deletes = [...(change.deletes || []), row.member];
    } else if (keyInfo.type === 'stream') {
      // @ts-ignore
      change.deletes = [...(change.deletes || []), row.id];
    }

    addOrUpdateChange(change);
  }

  function refresh() {
    refreshToken += 1;
  }

  function resetChanges() {
    changeSetRedis = { changes: [] };
    setEditorData({ changes: [] });
  }

  export async function save() {
    const driver = findEngineDriver($connection, $extensions);
    const callList = driver.getKeyValueMethodCallList ? driver.getKeyValueMethodCallList(changeSetRedis) : null;
    const script = callList ? convertRedisCallListToScript(callList) : null;

    if (script) {
      if (getBoolSettingsValue('skipConfirm.redisLikeDataSave', false)) {
        handleConfirmChange(callList);
      } else {
        showModal(ConfirmNoSqlModal, {
          script,
          onConfirm: () => handleConfirmChange(callList),
          skipConfirmSettingKey: 'skipConfirm.redisLikeDataSave',
        });
      }
    } else {
      handleConfirmChange(callList);
    }
  }

  export function canSave() {
    return hasChanges;
  }

  async function handleConfirmChange(callList) {
    const resp = await apiCall('database-connections/multi-call-method', {
      conid,
      database,
      callList,
    });
    if (resp?.errorMessage) {
      showSnackbarError(resp.errorMessage);
      return;
    } else {
      changeSetRedis = { changes: [] };
      setEditorData({ changes: [] });
      refreshToken += 1;
    }
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
          {key}
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
                  showAddForm = false;
                }}
                modifyRow={row => getDisplayRow(row, keyInfo)}
                onRemoveItem={row => handleRemoveItem(row, keyInfo)}
              />
            </svelte:fragment>
            <svelte:fragment slot="2">
              {#if showAddForm}
                <div class="add-field">
                {#if keyInfo.type === 'list'}
                  <DbKeyValueListEdit
                    dbKeyFields={keyInfo.keyType.dbKeyFields}
                    item={getExistingInserts(keyInfo)}
                    keyColumn={null}
                    onChangeItem={item => {
                      if (item && item.records && item.records.length > 0) {
                        const existingChange = changeSetRedis.changes.find(
                          c => c.key === keyInfo.key && c.type === keyInfo.type
                        );
                        // @ts-ignore
                        const listChange = existingChange || {
                          key: keyInfo.key,
                          type: 'list',
                          inserts: [],
                          updates: [],
                          deletes: [],
                        };
                        // @ts-ignore
                        listChange.inserts = item.records
                          .filter(r => r.value.trim() !== '')
                          .map(r => ({ value: r.value }));
                        addOrUpdateChange(listChange);
                      }
                    }}
                  />
                {:else if keyInfo.type === 'hash'}
                  <DbKeyValueHashEdit
                    dbKeyFields={keyInfo.keyType.dbKeyFields}
                    item={getExistingInserts(keyInfo)}
                    keyColumn={null}
                    onChangeItem={item => {
                      if (item && item.records && item.records.length > 0) {
                        const existingChange = changeSetRedis.changes.find(
                          c => c.key === keyInfo.key && c.type === keyInfo.type
                        );
                        // @ts-ignore
                        const hashChange = existingChange || {
                          key: keyInfo.key,
                          type: 'hash',
                          inserts: [],
                          updates: [],
                          deletes: [],
                        };
                        // @ts-ignore
                        hashChange.inserts = item.records
                          .filter(r => r.key.trim() !== '' && r.value.trim() !== '')
                          .map(r => ({ key: r.key, value: r.value, ttl: r.ttl ? parseInt(r.ttl) : undefined }));
                        addOrUpdateChange(hashChange);
                      }
                    }}
                  />
                {:else if keyInfo.type === 'zset'}
                  <DbKeyValueZSetEdit
                    dbKeyFields={keyInfo.keyType.dbKeyFields}
                    item={getExistingInserts(keyInfo)}
                    keyColumn={null}
                    onChangeItem={item => {
                      if (item && item.records && item.records.length > 0) {
                        const existingChange = changeSetRedis.changes.find(
                          c => c.key === keyInfo.key && c.type === keyInfo.type
                        );
                        // @ts-ignore
                        const zsetChange = existingChange || {
                          key: keyInfo.key,
                          type: 'zset',
                          inserts: [],
                          updates: [],
                          deletes: [],
                        };
                        // @ts-ignore
                        zsetChange.inserts = item.records
                          .filter(r => r.member.trim() !== '' && r.score.trim() !== '')
                          .map(r => ({ member: r.member, score: parseFloat(r.score) }));
                        addOrUpdateChange(zsetChange);
                      }
                    }}
                  />
                {:else if keyInfo.type === 'set'}
                  <DbKeyValueSetEdit
                    dbKeyFields={keyInfo.keyType.dbKeyFields}
                    item={getExistingInserts(keyInfo)}
                    keyColumn={null}
                    onChangeItem={item => {
                      if (item && item.records && item.records.length > 0) {
                        const existingChange = changeSetRedis.changes.find(
                          c => c.key === keyInfo.key && c.type === keyInfo.type
                        );
                        // @ts-ignore
                        const setChange = existingChange || {
                          key: keyInfo.key,
                          type: 'set',
                          inserts: [],
                          updates: [],
                          deletes: [],
                        };
                        // @ts-ignore
                        setChange.inserts = item.records
                          .filter(r => r.value.trim() !== '')
                          .map(r => ({ value: r.value }));
                        addOrUpdateChange(setChange);
                      }
                    }}
                  />
                {:else if keyInfo.type === 'stream'}
                  <DbKeyValueStreamEdit
                    dbKeyFields={keyInfo.keyType.dbKeyFields}
                    item={getExistingInserts(keyInfo)}
                    keyColumn={null}
                    onChangeItem={item => {
                      if (item && item.records && item.records.length > 0) {
                        const existingChange = changeSetRedis.changes.find(
                          c => c.key === keyInfo.key && c.type === keyInfo.type
                        );
                        // @ts-ignore
                        const streamChange = existingChange || {
                          key: keyInfo.key,
                          type: 'stream',
                          inserts: [],
                          updates: [],
                          deletes: [],
                        };
                        // @ts-ignore
                        streamChange.inserts = item.records
                          .filter(r => r.value && r.value.trim() !== '')
                          .map(r => ({ id: r.id && r.id.trim() ? r.id.trim() : '*', value: r.value }));
                        addOrUpdateChange(streamChange);
                      }
                    }}
                  />
                {/if}
                </div>
              {:else if keyInfo.type === 'hash'}
                <DbKeyValueHashDetail
                  item={getDisplayRow(currentRow, keyInfo)}
                  onChangeItem={item => {
                    if (!currentRow) return;

                    const existingChange = changeSetRedis.changes.find(
                      c => c.key === keyInfo.key && c.type === keyInfo.type
                    );

                    const originalKey = currentRow._originalKey || currentRow.key;
                    let hashChange;
                    if (existingChange) {
                      // @ts-ignore
                      const updateIndex = existingChange.updates?.findIndex(u => u.originalKey === originalKey) ?? -1;
                      const newUpdate = { originalKey: originalKey, key: item.key, value: item.value, ttl: item.TTL };

                      if (updateIndex >= 0) {
                        // @ts-ignore
                        hashChange = {
                          ...existingChange,
                          updates: existingChange.updates.map((u, idx) => (idx === updateIndex ? newUpdate : u)),
                        };
                      } else {
                        // @ts-ignore
                        hashChange = {
                          ...existingChange,
                          updates: [...(existingChange.updates || []), newUpdate],
                        };
                      }
                    } else {
                      // @ts-ignore
                      hashChange = {
                        key: keyInfo.key,
                        type: 'hash',
                        inserts: [],
                        updates: [{ originalKey: originalKey, key: item.key, value: item.value, ttl: item.TTL }],
                        deletes: [],
                      };
                    }

                    addOrUpdateChange(hashChange);

                    currentRow = {
                      ...currentRow,
                      _originalKey: originalKey,
                      key: item.key,
                      value: item.value,
                      TTL: item.TTL,
                    };
                  }}
                />
              {:else if keyInfo.type === 'zset'}
                <DbKeyValueZSetDetail
                  item={getDisplayRow(currentRow, keyInfo)}
                  onChangeItem={item => {
                    const existingChange = changeSetRedis.changes.find(
                      c => c.key === keyInfo.key && c.type === keyInfo.type
                    );

                    let zsetChange;
                    if (existingChange) {
                      // @ts-ignore
                      const updateIndex = existingChange.updates?.findIndex(u => u.member === currentRow.member) ?? -1;
                      const newUpdate = { member: item.member, score: item.score };

                      if (updateIndex >= 0) {
                        // @ts-ignore
                        zsetChange = {
                          ...existingChange,
                          updates: existingChange.updates.map((u, idx) => (idx === updateIndex ? newUpdate : u)),
                        };
                      } else {
                        // @ts-ignore
                        zsetChange = {
                          ...existingChange,
                          updates: [...(existingChange.updates || []), newUpdate],
                        };
                      }
                    } else {
                      // @ts-ignore
                      zsetChange = {
                        key: keyInfo.key,
                        type: 'zset',
                        inserts: [],
                        updates: [{ member: item.member, score: item.score }],
                        deletes: [],
                      };
                    }

                    addOrUpdateChange(zsetChange);
                    currentRow = { ...currentRow, member: item.member, score: item.score };
                  }}
                />
              {:else if keyInfo.type === 'stream'}
                <DbKeyValueStreamDetail item={getDisplayRow(currentRow, keyInfo)} />
              {:else}
                <DbKeyItemDetail
                  dbKeyFields={keyInfo.keyType.dbKeyFields}
                  item={getDisplayRow(currentRow, keyInfo)}
                  onChangeItem={item => {
                    const existingChange = changeSetRedis.changes.find(
                      c => c.key === keyInfo.key && c.type === keyInfo.type
                    );

                    if (keyInfo.type === 'list') {
                      // @ts-ignore
                      const listChange = existingChange || {
                        key: keyInfo.key,
                        type: 'list',
                        inserts: [],
                        updates: [],
                        deletes: [],
                      };
                      // @ts-ignore
                      const updateIndex = listChange.updates?.findIndex(u => u.index === item.rowNumber) ?? -1;
                      if (updateIndex >= 0) {
                        // @ts-ignore
                        listChange.updates[updateIndex] = { index: item.rowNumber, value: item.value };
                      } else {
                        // @ts-ignore
                        listChange.updates = [
                          ...(listChange.updates || []),
                          { index: item.rowNumber, value: item.value },
                        ];
                      }
                      addOrUpdateChange(listChange);
                    }
                  }}
                />
              {/if}
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
                } else if (keyInfo.type === 'JSON') {
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
      <ToolStripCommandButton command="redisLikeData.save" />
      {#if keyInfo.keyType?.addMethod && keyInfo.keyType?.showItemList}
        <ToolStripButton
          icon="icon add"
          on:click={() => {
            showAddForm = true;
          }}>Add field</ToolStripButton
        >
      {/if}
      <ToolStripButton icon="icon refresh" on:click={refresh}
        >{_t('common.refresh', { defaultMessage: 'Refresh' })}</ToolStripButton
      >
      {#if changeSetRedis?.changes?.length > 0}
        <ToolStripButton icon="icon close" on:click={resetChanges}>Reset changes</ToolStripButton>
        <ToolStripDropDownButton
          icon="icon edit"
          label="Changed keys"
          menu={() =>
            changeSetRedis.changes.map(item => ({
              label: item.key,
              onClick: () => {
                activeDbKeysStore.update(store => ({
                  ...store,
                  [`${conid}:${database}`]: item.key,
                }));
              },
            }))}
          iconAfter={getNumberIcon(changeSetRedis.changes.length)}
        />
      {/if}
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
    align-items: center;
    gap: 12px;

    padding-top: 6px;
    padding-bottom: 6px;
    padding-left: 12px;
    padding-right: 12px;
    background: var(--theme-tabs-control-background);
    border-bottom: var(--theme-panel-border-subtle);
    transition: all 0.2s ease;
  }

  .type {
    display: flex;
    align-items: center;
    gap: 8px;

    font-size: 12px;
    font-weight: 500;
    color: var(--theme-panel-type-label-color);
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .key-name {
    flex-grow: 1;
    display: flex;
    align-items: center;
    padding: 8px 12px;
    
    font-size: 14px;
    color: var(--theme-generic-font);
  }


  .value-holder {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    padding: 16px;
    background-color: var(--theme-dbkey-background);

    display: flex;
    flex-direction: column;
  }

  .add-field {
    padding: 16px;
    background-color: var(--theme-dbkey-background);
    height: 100%;
    width: 100%;
    border-top: var(--theme-dbkey-border);
    overflow-y: auto;
  }
</style>
