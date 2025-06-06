<script lang="ts">
  import { useCloudContentList, useConfig, useConnectionInfo } from '../utility/metadataLoaders';

  import ConnectionList from './ConnectionList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import SingleConnectionDatabaseList from './SingleConnectionDatabaseList.svelte';
  import _ from 'lodash';
  import { _t } from '../translations';
  import DatabaseWidgetDetailContent from './DatabaseWidgetDetailContent.svelte';

  export let hidden = false;
  let domSqlObjectList = null;

  $: config = useConfig();
  $: cloudContentList = useCloudContentList();
</script>

<WidgetColumnBar {hidden}>
  {#if $config?.singleConnection}
    <WidgetColumnBarItem
      title={_t('widget.databases', { defaultMessage: 'Databases' })}
      name="databases"
      height="35%"
      storageName="databasesWidget"
    >
      <SingleConnectionDatabaseList connection={$config?.singleConnection} />
    </WidgetColumnBarItem>
  {:else if !$config?.singleDbConnection}
    <WidgetColumnBarItem
      title={_t('common.connections', { defaultMessage: 'Connections' })}
      name="connections"
      height="35%"
      storageName="connectionsWidget"
    >
      <ConnectionList
        passProps={{
          onFocusSqlObjectList: () => domSqlObjectList.focus(),
          cloudContentList: $cloudContentList,
        }}
      />
    </WidgetColumnBarItem>
  {/if}

  <DatabaseWidgetDetailContent bind:domSqlObjectList showCloudConnection={false} />
</WidgetColumnBar>
