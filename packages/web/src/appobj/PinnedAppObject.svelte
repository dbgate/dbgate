<script lang="ts" context="module">
  import DatabaseAppObject from './DatabaseAppObject.svelte';
  import DatabaseObjectAppObject from './DatabaseObjectAppObject.svelte';

  export const extractKey = data => {
    if (data.objectTypeField) {
      return `${data.objectTypeField}||${data.schemaName}||${data.pureName}`;
    }
    return data.connection._id;
  };

  function dragExchange(dragged, data, pinned, setPinned, compare) {
    if (!compare(dragged, data)) {
      const i1 = _.findIndex(pinned, x => compare(x, dragged));
      const i2 = _.findIndex(pinned, x => compare(x, data));
      if (i1 >= 0 && i2 >= 0 && i1 != i2) {
        const newPinned = [...pinned];
        const tmp = newPinned[i1];
        newPinned[i1] = newPinned[i2];
        newPinned[i2] = tmp;
        setPinned(newPinned);
      }
    }
  }
</script>

<script lang="ts">
  import _, { values } from 'lodash';
  import { draggedPinnedObject, pinnedDatabases, pinnedTables } from '../stores';

  export let data;
</script>

{#if data}
  {#if data.objectTypeField}
    <DatabaseObjectAppObject
      {...$$props}
      on:dragstart={() => {
        $draggedPinnedObject = data;
      }}
      on:dragenter={e => {
        dragExchange(
          $draggedPinnedObject,
          data,
          $pinnedTables,
          value => ($pinnedTables = value),
          (a, b) => a?.pureName == b?.pureName && a?.schemaName == b?.schemaName
        );
      }}
      on:dragend={() => {
        $draggedPinnedObject = null;
      }}
    />
  {:else}
    <DatabaseAppObject
      {...$$props}
      on:dragstart={() => {
        $draggedPinnedObject = data;
      }}
      on:dragenter={e => {
        dragExchange(
          $draggedPinnedObject,
          data,
          $pinnedDatabases,
          value => ($pinnedDatabases = value),
          (a, b) => a?.name == b?.name && a?.connection?._id == b?.connection?._id
        );
      }}
      on:dragend={() => {
        $draggedPinnedObject = null;
      }}
    />
  {/if}
{/if}
