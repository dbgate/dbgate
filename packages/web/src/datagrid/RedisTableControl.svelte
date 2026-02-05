<script lang="ts">
  import { onMount, tick } from 'svelte';

  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import { apiCall } from '../utility/api';
  import createRef from '../utility/createRef';
  import FontIcon from '../icons/FontIcon.svelte';
  import { supportedRedisKeyTypes } from 'dbgate-tools';
  import uuidv1 from 'uuid/v1';
  import _ from 'lodash';

  export let conid;
  export let database;
  export let keyInfo;
  export let onChangeSelected;
  export let modifyRow = null;
  export let changeSetRedis = null;
  export let onRemoveItem = null;

  let rows = [];
  let cursor = 0;
  let isLoading = false;
  let loadNextNeeded = false;
  let isLoadedAll = false;
  let selectedIndex;
  const oldIndexRef = createRef(null);

  async function loadNextRows() {
    if (isLoadedAll) {
      return;
    }
    if (isLoading) {
      // console.log('ALREADY LOADING');
      loadNextNeeded = true;
      return;
    }
    isLoading = true;
    try {
      const res = await apiCall('database-connections/load-key-table-range', {
        conid,
        database,
        key: keyInfo.key,
        cursor,
        count: 10,
      });
      const newRows = [...rows];
      for (const row of res.items) {
        if (keyInfo.keyColumn && newRows.find(x => x[keyInfo.keyColumn] == row[keyInfo.keyColumn])) {
          continue;
        }
        newRows.push({ rowNumber: newRows.length, editorRowId: uuidv1(), ...row });
      }

      rows = newRows;
      cursor = res.cursor;
      isLoadedAll = cursor == 0;
    } finally {
      isLoading = false;
    }

    if (loadNextNeeded) {
      loadNextNeeded = false;
      await tick();
      loadNextRows();
    }
  }

  $: {
    if (onChangeSelected && displayRows[selectedIndex]) {
      if (oldIndexRef.get() != selectedIndex) {
        oldIndexRef.set(selectedIndex);
        onChangeSelected(displayRows[selectedIndex]);
      }
    }
  }

  $: {
    keyInfo;
  }
  onMount(() => {
    loadNextRows();
  });

  $: displayRows = createDisplayRows(rows, changeSetRedis, keyInfo, modifyRow);

  function createDisplayRows(sourceRows, changeSet, keyInfoParam, modifyRowFunc) {
    let result = modifyRowFunc ? sourceRows.map(row => modifyRowFunc(row)) : sourceRows;

    // Mark deleted rows and add inserted rows from changeset
    if (changeSet && keyInfoParam) {
      const existingChange = changeSet.changes.find(c => c.key === keyInfoParam.key && c.type === keyInfoParam.type);

      if (existingChange) {
        // Mark existing rows as deleted if they're in the deletes array
        if (existingChange.deletes) {
          result = result.map(row => {
            let isDeleted = false;

            if (keyInfoParam.type === 'hash') {
              isDeleted = existingChange.deletes.includes(row.key);
            } else if (keyInfoParam.type === 'set') {
              isDeleted = existingChange.deletes.includes(row.value);
            } else if (keyInfoParam.type === 'zset') {
              isDeleted = existingChange.deletes.includes(row.member);
            } else if (keyInfoParam.type === 'stream') {
              isDeleted = existingChange.deletes.includes(row.id);
            }

            return isDeleted ? { ...row, __isDeleted: true } : row;
          });
        }

        // Mark rows updated in the changeset
        if (existingChange.updates) {
          result = result.map(row => {
            let isChanged = false;

            if (keyInfoParam.type === 'hash') {
              const originalKey = row._originalKey || row.key;
              isChanged = existingChange.updates.some(update => update.originalKey === originalKey);
            } else if (keyInfoParam.type === 'list') {
              isChanged = existingChange.updates.some(update => update.index === row.rowNumber);
            } else if (keyInfoParam.type === 'zset') {
              isChanged = existingChange.updates.some(update => update.member === row.member);
            } else if (keyInfoParam.type === 'stream') {
              isChanged = existingChange.updates.some(update => update.id === row.id);
            }

            return isChanged ? { ...row, __isChanged: true } : row;
          });
        }

        // Add inserted rows from changeset
        if (existingChange.inserts?.length > 0) {
          if (existingChange.type == 'stream') {
            result = [
              ...result,
              {
                __isAdded: true,
                rowNumber: result.length,
                id: existingChange.generatedId || '*',
                value: JSON.stringify(_.fromPairs(existingChange.inserts.map(i => [i.field, i.value]))),
              },
            ];
          } else {
            result = [
              ...result,
              ...existingChange.inserts.map((insert, index) => ({
                ...insert,
                rowNumber: result.length + index,
                __isAdded: true,
              })),
            ];
          }
        }
      }
    }

    return result;
  }

  $: shouldShowRemoveColumn = keyInfo && ['set', 'hash', 'zset', 'stream'].includes(keyInfo.type);

  function handleRemoveItem(row) {
    if (onRemoveItem) {
      onRemoveItem(row);
    }
  }

  $: keyType = supportedRedisKeyTypes.find(t => t.name === keyInfo?.type);
</script>

<div class="table-wrapper">
  <ScrollableTableControl
    columns={[
      {
        fieldName: 'rowNumber',
        header: 'num',
        width: '60px',
        slot: 1,
      },
      ...(keyType.dbKeyFieldsForGrid ?? keyType.dbKeyFields).map(column => ({
        fieldName: column.name,
        header: column.name,
      })),
      ...(shouldShowRemoveColumn
        ? [
            {
              fieldName: '__remove',
              header: '',
              width: '30px',
              slot: 0,
            },
          ]
        : []),
    ]}
    rows={displayRows}
    onLoadNext={isLoadedAll ? null : loadNextRows}
    selectable
    singleLineRow
    bind:selectedIndex
    disableFocusOutline
  >
    <div slot="0" let:row>
      <button class="delete-button" on:click={() => handleRemoveItem(row)}>
        <FontIcon icon="icon delete" />
      </button>
    </div>
    <div slot="1" let:row>
      {row['rowNumber'] + 1}
    </div>
  </ScrollableTableControl>
</div>

<style>
  .table-wrapper {
    display: flex;
    flex-direction: column;
    overflow: auto;
    padding: 8px 16px;
    width: 100%;
  }

  .table-wrapper :global(.wrapper) {
    position: relative !important;
    height: 100%;
  }

  .delete-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--theme-generic-font-grayed);
  }

  .delete-button:hover {
    color: var(--theme-generic-font-hover);
  }
</style>
