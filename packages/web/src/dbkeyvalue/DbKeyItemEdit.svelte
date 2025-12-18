<script lang="ts">
    import _ from 'lodash';
    import DbKeyValueDetail from './DbKeyValueDetail.svelte';

    export let dbKeyFields;
    export let item;
    export let onChangeItem = null;
    export let keyColumn = null;

    $: console.log('DbKeyItemEdit', { item, dbKeyFields, keyColumn, onChangeItem: !!onChangeItem });

    function getValueAsString(value) {
        if (value === null || value === undefined) return undefined;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        return JSON.stringify(value);
    }
</script>

<div class="props">
    {#each dbKeyFields as column}
        <div class="field-wrapper">
            <DbKeyValueDetail
                value={getValueAsString(item?.[column.name])}
                columnTitle={_.startCase(column.name)}
                onChangeValue={onChangeItem && column.name !== keyColumn
                    ? value => {
                          onChangeItem?.({
                              ...item,
                              [column.name]: value,
                          });
                      }
                    : null}
            />
        </div>
    {/each}
</div>

<style>
    .props {
        flex: 1;
        display: flex;
        flex-direction: row;
        gap: 10px;
        padding: 10px;
        overflow: hidden;
    }

    .field-wrapper {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        max-height: 100px;
    }
</style>