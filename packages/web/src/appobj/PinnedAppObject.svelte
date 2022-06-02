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

  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { draggedPinnedObject, pinnedDatabases } from '../stores';

  export let data;
</script>

{#if data.objectTypeField}
  <DatabaseObjectAppObject {...$$props} 
  />
{:else}
  <DatabaseAppObject
    {...$$props}
    on:dragstart={() => {
      $draggedPinnedObject = data;
    }}
    on:dragenter={e => {
      const dragged = $draggedPinnedObject;
      if (dragged?.connection?._id != data?.connection?._id || dragged?.name != data?.name) {
        const dbs = $pinnedDatabases;
        const i1 = _.findIndex(dbs, x => x?.name == dragged?.name && x?.connection?._id == dragged?.connection?._id);
        const i2 = _.findIndex(dbs, x => x?.name == data?.name && x?.connection?._id == data?.connection?._id);
        const newDbs = [...dbs];
        const tmp = newDbs[i1];
        newDbs[i1] = newDbs[i2];
        newDbs[i2] = tmp;
        $pinnedDatabases = newDbs;
      }
    }}
    on:dragend={() => {
      $draggedPinnedObject = null;
    }}
  />
{/if}
