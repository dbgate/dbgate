<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, openedConnections } from '../stores';
  import openNewTab from '../utility/openNewTab';

  export let commonProps;
  export let data;

  const icons = {
    tables: 'img table',
    views: 'img view',
    procedures: 'img procedure',
    functions: 'img function',
  };

  function handleClick() {
    const { schemaName, pureName, conid, database, objectTypeField } = data;
    openNewTab({
      title: data.pureName,
      icon: 'img table',
      tabComponent: 'TableDataTab',
      props: {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
      },
    });
  }
</script>

<AppObjectCore
  {...commonProps}
  {data}
  title={data.schemaName ? `${data.schemaName}.${data.pureName}` : data.pureName}
  icon={icons[data.objectTypeField]}
  on:click={handleClick}
/>
