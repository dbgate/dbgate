<script lang="ts" context="module">
  export const extractKey = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);
  export const createMatcher = ({ pureName }) => filter => filterName(filter, pureName);
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, openedConnections } from '../stores';
  import openNewTab from '../utility/openNewTab';
  import { filterName } from 'dbgate-datalib';

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
