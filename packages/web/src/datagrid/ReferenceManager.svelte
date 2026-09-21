<script lang="ts">
  import { GridDisplay } from 'dbgate-datalib';
  import { filterName } from 'dbgate-tools';
  import { createEventDispatcher, getContext } from 'svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import TokenizedFilteredText from '../widgets/TokenizedFilteredText.svelte';

  import { _t } from '../translations';
  import { trackUsage } from '../utility/usageAnalytics';

  export let managerSize;
  export let display: GridDisplay;
  export let onReferenceClick = ref => {};

  const dispatch = createEventDispatcher();
  const tabid = getContext('tabid');

  /** kind is 'reference' for a referenced table, 'dependency' for a dependent one. */
  function handleReferenceClick(kind, ref) {
    trackUsage({ feature: 'data_grid', action: 'open_reference', param: kind }, tabid);
    onReferenceClick(ref);
  }

  let filter;

  $: foreignKeys = display?.baseTable?.foreignKeys || [];
  $: dependencies = display?.baseTable?.dependencies || [];
</script>

<SearchBoxWrapper altsearchbox {filter}>
  <SearchInput placeholder={_t('dataGrid.searchReferences', { defaultMessage: 'Search references' })} bind:value={filter} altsearchbox/>
  <CloseSearchButton bind:filter />
</SearchBoxWrapper>
<ManagerInnerContainer width={managerSize}>
  {#if foreignKeys.length > 0}
    <div class="bold nowrap ml-1">{_t('dataGrid.referencesTables', { defaultMessage: 'References tables' })} ({foreignKeys.length})</div>
    {#each foreignKeys.filter(fk => filterName(filter, fk.refTableName)) as fk}
      <div
        class="link"
        on:click={() =>
          handleReferenceClick('reference', {
            schemaName: fk.refSchemaName,
            pureName: fk.refTableName,
            columns: fk.columns.map(col => ({
              baseName: col.columnName,
              refName: col.refColumnName,
            })),
          })}
      >
        <FontIcon icon="img link" />
        <div class="ml-1 nowrap">
          <TokenizedFilteredText text={fk.refTableName} {filter} />
          ({fk.columns.map(x => x.columnName).join(', ')})
        </div>
      </div>
    {/each}
  {/if}

  {#if dependencies.length > 0}
    <div class="bold nowrap ml-1">{_t('dataGrid.dependentTables', { defaultMessage: 'Dependent tables' })} ({dependencies.length})</div>
    {#each dependencies.filter(fk => filterName(filter, fk.pureName)) as fk}
      <div
        class="link"
        on:click={() =>
          handleReferenceClick('dependency', {
            schemaName: fk.schemaName,
            pureName: fk.pureName,
            columns: fk.columns.map(col => ({
              baseName: col.refColumnName,
              refName: col.columnName,
            })),
          })}
      >
        <FontIcon icon="img reference" />
        <div class="ml-1 nowrap">
          <TokenizedFilteredText text={fk.pureName} {filter} />
          ({fk.columns.map(x => x.columnName).join(', ')})
        </div>
      </div>
    {/each}
  {/if}
</ManagerInnerContainer>

<style>
  .link {
    color: var(--theme-link-foreground);
    margin: 5px;
    cursor: pointer;
    display: flex;
    flex-wrap: nowrap;
  }
  .link:hover {
    text-decoration: underline;
  }
</style>
