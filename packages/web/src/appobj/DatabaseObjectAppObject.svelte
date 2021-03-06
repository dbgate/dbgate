<script lang="ts" context="module">
  export const extractKey = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);
  export const createMatcher = ({ pureName }) => filter => filterName(filter, pureName);

  const icons = {
    tables: 'img table',
    views: 'img view',
    procedures: 'img procedure',
    functions: 'img function',
  };

  const defaultTabs = {
    tables: 'TableDataTab',
    views: 'ViewDataTab',
  };

  export async function openDatabaseObjectDetail(
    tabComponent,
    sqlTemplate,
    { schemaName, pureName, conid, database, objectTypeField },
    forceNewTab,
    initialData
  ) {
    const connection = await getConnectionInfo({ conid });
    const tooltip = `${connection.displayName || connection.server}\n${database}\n${fullDisplayName({
      schemaName,
      pureName,
    })}`;

    openNewTab(
      {
        title: sqlTemplate ? 'Query #' : pureName,
        tooltip,
        icon: sqlTemplate ? 'img sql-file' : icons[objectTypeField],
        tabComponent: sqlTemplate ? 'QueryTab' : tabComponent,
        props: {
          schemaName,
          pureName,
          conid,
          database,
          objectTypeField,
          initialArgs: sqlTemplate ? { sqlTemplate } : null,
        },
      },
      initialData,
      { forceNewTab }
    );
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, openedConnections } from '../stores';
  import openNewTab from '../utility/openNewTab';
  import { filterName } from 'dbgate-datalib';
  import { getConnectionInfo } from '../utility/metadataLoaders';
  import fullDisplayName from '../utility/fullDisplayName';

  export let data;

  function handleClick() {
    const { schemaName, pureName, conid, database, objectTypeField } = data;

    openDatabaseObjectDetail(
      defaultTabs[objectTypeField],
      defaultTabs[objectTypeField] ? null : 'CREATE OBJECT',
      {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
      },
      false,
      null
    );

    // openNewTab({
    //   title: data.pureName,
    //   icon: 'img table',
    //   tabComponent: 'TableDataTab',
    //   props: {
    //     schemaName,
    //     pureName,
    //     conid,
    //     database,
    //     objectTypeField,
    //   },
    // });
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.schemaName ? `${data.schemaName}.${data.pureName}` : data.pureName}
  icon={icons[data.objectTypeField]}
  on:click={handleClick}
  on:expand
/>
