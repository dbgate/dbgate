<script lang="ts">
  import _ from 'lodash';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { onMount } from 'svelte';
  import openNewTab from '../utility/openNewTab';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import { _t } from '../translations';
  import { trackUsage } from '../utility/usageAnalytics';
  import { getConnectionInfo } from '../utility/metadataLoaders';

  let filter = '';
  let search = '';

  let historyItems = [];

  async function reloadItems() {
    const resp = await apiCall('query-history/read', { filter: search, limit: 100 });
    historyItems = resp;
  }

  $: {
    search;
    reloadItems();
  }

  /** The executed SQL is never sent, only that a history item was opened. */
  async function trackHistoryOpen(item) {
    let engine;
    try {
      engine = (await getConnectionInfo({ conid: item.conid }))?.engine;
    } catch {
      // Analytics must not depend on metadata loading.
    }
    trackUsage({ feature: 'query_history', action: 'open', engine });
  }

  const setDebouncedFilter = _.debounce(value => (search = value), 500);

  $: setDebouncedFilter(filter);

  onMount(() => {
    apiOn('query-history-changed', reloadItems);
    return () => {
      apiOff('query-history-changed', reloadItems);
    };
  });
</script>

<SearchBoxWrapper {filter}>
  <SearchInput placeholder={_t('history.searchQueryHistory', { defaultMessage: "Search query history" })} {filter} bind:value={filter} />
  <CloseSearchButton
    bind:filter
    on:click={() => {
      search = '';
    }}
  />
</SearchBoxWrapper>
<WidgetsInnerContainer>
  {#each historyItems as item}
    <div
      class="wrapper"
      title={item.sql}
      on:click={() => {
        trackHistoryOpen(item);
        openNewTab(
          {
            title: _t('database.queryDesigner', { defaultMessage: "Query #" }),
            icon: 'icon sql-file',
            tabComponent: 'QueryTab',
            focused: true,
            props: {
              conid: item.conid,
              database: item.database,
            },
          },
          { editor: item.sql }
        );
      }}
    >
      <div class="sql">
        <FontIcon icon="icon sql-file" />
        {item.sql}
      </div>
      <div class="info">
        <FontIcon icon="icon database" />
        {item.database}
      </div>
    </div>
  {/each}
</WidgetsInnerContainer>

<style>
  .wrapper {
    padding: 5px;
  }
  .wrapper:hover {
    background-color: var(--theme-content-background-hover);
  }
  .info {
    margin-left: 30px;
    margin-top: 5px;
    color: var(--theme-generic-font-grayed);
  }
  .sql {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
