<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SubDatabaseList from '../appobj/SubDatabaseList.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { apiCall } from '../utility/api';
  import AppObjectListHandler from './AppObjectListHandler.svelte';
  import { useDatabaseList } from '../utility/metadataLoaders';
  import { filterName } from 'dbgate-tools';
  import { currentDatabase, focusedConnectionOrDatabase, getFocusedConnectionOrDatabase } from '../stores';
  import { switchCurrentDatabase } from '../utility/common';
  import { getConnectionClickActionSetting, getDatabaseClickActionSetting } from '../settings/settingsTools';

  export let connection;

  let filter = '';

  let domListHandler;
  let domContainer = null;
  let domFilter = null;

  $: databases = useDatabaseList({ conid: connection?._id });

  const handleRefreshDatabases = () => {
    apiCall('server-connections/refresh', { conid: connection._id });
  };

  function getFocusFlatList() {
    const res = [];
    for (const db of $databases) {
      if (!filterName(filter, db.name)) {
        continue;
      }

      res.push({
        connection,
        conid: connection._id,
        database: db.name,
      });
    }

    return res;
  }
</script>

<SearchBoxWrapper>
  <SearchInput
    placeholder="Search connection or database"
    bind:value={filter}
    bind:this={domFilter}
    onFocusFilteredList={() => {
      domListHandler?.focusFirst();
    }}
  />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={handleRefreshDatabases} title="Refresh database list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectListHandler
    bind:this={domListHandler}
    list={getFocusFlatList}
    selectedObjectStore={focusedConnectionOrDatabase}
    getSelectedObject={getFocusedConnectionOrDatabase}
    selectedObjectMatcher={(o1, o2) => o1?.conid == o2?.conid && o1?.database == o2?.database}
    getDefaultFocusedItem={() =>
      $currentDatabase
        ? {
            conid: $currentDatabase?.connection?._id,
            database: $currentDatabase?.name,
            connection: $currentDatabase?.connection,
          }
        : null}
    onScrollTop={() => {
      domContainer?.scrollTop();
    }}
    onFocusFilterBox={text => {
      domFilter?.focus(text);
    }}
    handleObjectClick={(data, clickAction) => {
      const connectionClickAction = getConnectionClickActionSetting();
      const databaseClickAction = getDatabaseClickActionSetting();

      if (data.database) {
        if (databaseClickAction == 'switch' && clickAction == 'leftClick') {
          switchCurrentDatabase({ connection: data.connection, name: data.database });
        }

        if (clickAction == 'keyEnter' || clickAction == 'dblClick') {
          switchCurrentDatabase({ connection: data.connection, name: data.database });
        }
      }
    }}
  >
    <SubDatabaseList data={connection} {filter} passProps={{}} />
  </AppObjectListHandler>
</WidgetsInnerContainer>
