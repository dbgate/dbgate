<script lang="ts">
  import { GridDisplay } from 'dbgate-datalib';
  import { filterName } from 'dbgate-tools';
  import { createEventDispatcher } from 'svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import TokenizedFilteredText from '../widgets/TokenizedFilteredText.svelte';

  export let managerSize;
  export let display: GridDisplay;
  export let onReferenceClick = ref => {};

  const dispatch = createEventDispatcher();

  let filter;

  $: foreignKeys = display?.baseTable?.foreignKeys || [];
  $: dependencies = display?.baseTable?.dependencies || [];
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search references" bind:value={filter} />
  <CloseSearchButton bind:filter />
</SearchBoxWrapper>
<ManagerInnerContainer width={managerSize}>
  {#if foreignKeys.length > 0}
    <div class="bold nowrap ml-1">References tables ({foreignKeys.length})</div>
    {#each foreignKeys.filter(fk => filterName(filter, fk.refTableName)) as fk}
      <div
        class="link"
        on:click={() =>
          onReferenceClick({
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
    <div class="bold nowrap ml-1">Dependend tables ({dependencies.length})</div>
    {#each dependencies.filter(fk => filterName(filter, fk.pureName)) as fk}
      <div
        class="link"
        on:click={() =>
          onReferenceClick({
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
    color: var(--theme-font-link);
    margin: 5px;
    cursor: pointer;
    display: flex;
    flex-wrap: nowrap;
  }
  .link:hover {
    text-decoration: underline;
  }
</style>
