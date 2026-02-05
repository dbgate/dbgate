<script lang="ts">
  import { writable } from 'svelte/store';
  import MessageViewRow from './MessageViewRow.svelte';
  import RowsFilterSwitcher from '../forms/RowsFilterSwitcher.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import { filterName } from 'dbgate-tools';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { _t } from '../translations';

  export let items: any[];
  export let showProcedure = false;
  export let showLine = false;
  export let showCaller = false;
  export let startLine = 0;
  export let onMessageClick = null;
  export let onExplainError = null;
  export let engine = null;

  export let filter = '';
  export let onClear = null;

  $: time0 = items[0] && new Date(items[0].time).getTime();

  // $: console.log('MESSAGE ROWS', items);
  const values = writable({
    hideDebug: true,
    hideInfo: false,
    hideError: false,
  });

  function filterRow(row, filter, values) {
    return (
      (!filter || filterName(filter, JSON.stringify(row))) &&
      ((!values.hideDebug && row.severity == 'debug') ||
        (!values.hideInfo && row.severity == 'info') ||
        (!values.hideError && row.severity == 'error') ||
        (!values.hideDebug && !values.hideInfo && !values.hideError))
    );
  }
</script>

<div class="main">
  <div class="topbar">
    {#if onClear}
      <div class="topbar-btn">
        <InlineButton
          icon="img clear"
          on:click={() => {
            onClear();
          }}
        >
          <FontIcon icon="icon delete" padRight />
          {_t('messageView.clear', { defaultMessage: "Clear" })}
        </InlineButton>
      </div>
    {/if}
    <div class="topbar-btn">
      <RowsFilterSwitcher
        icon="img debug"
        label={_t('messageView.debug', { defaultMessage: "Debug" })}
        {values}
        field="hideDebug"
        count={items.filter(x => x.severity == 'debug').length}
      />
    </div>
    <div class="topbar-btn">
      <RowsFilterSwitcher
        icon="img info"
        label={_t('messageView.info', { defaultMessage: "Info" })}
        {values}
        field="hideInfo"
        count={items.filter(x => x.severity == 'info').length}
      />
    </div>
    <div class="topbar-btn">
      <RowsFilterSwitcher
        icon="img error"
        label={_t('messageView.error', { defaultMessage: "Error" })}
        {values}
        field="hideError"
        count={items.filter(x => x.severity == 'error').length}
      />
    </div>
    <div class="topbar-spacer" />
    <SearchInput placeholder={_t('messageView.filterLogMessages', { defaultMessage: "Filter log messages" })} bind:value={filter} />
  </div>
  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <td class="header">{_t('messageView.number', { defaultMessage: 'Number' })}</td>
          <td class="header">{_t('messageView.message', { defaultMessage: 'Message' })}</td>
          <td class="header">{_t('messageView.time', { defaultMessage: 'Time' })}</td>
          <td class="header">{_t('messageView.delta', { defaultMessage: 'Delta' })}</td>
          <td class="header">{_t('messageView.duration', { defaultMessage: 'Duration' })}</td>
          {#if showProcedure}
            <td class="header">{_t('messageView.procedure', { defaultMessage: 'Procedure' })}</td>
          {/if}
          {#if showLine}
            <td class="header">{_t('messageView.line', { defaultMessage: 'Line' })}</td>
          {/if}
          {#if showCaller}
            <td class="header">{_t('messageView.caller', { defaultMessage: 'Caller' })}</td>
          {/if}
        </tr>
      </thead>
      {#each items.filter(row => filterRow(row, filter, $values)) as row, index}
        <MessageViewRow
          {row}
          {index}
          {showProcedure}
          {showLine}
          {showCaller}
          {time0}
          {startLine}
          previousRow={index > 0 ? items[index - 1] : null}
          {onMessageClick}
          {onExplainError}
          {engine}
        />
      {/each}
    </table>
  </div>
</div>

<style>
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--theme-datagrid-background);
    color: var(--theme-datagrid-foreground);
  }
  .tablewrap {
    flex: 1;
    position: relative;
    overflow: scroll;
  }
  table {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    border-spacing: 0;
    border-collapse: collapse;
    overflow: scroll;
    background-color: var(--theme-datagrid-cell-background);
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 2px;
    background-color: var(--theme-datagrid-background);
    border-bottom: var(--theme-datagrid-border-horizontal);
    border-top: var(--theme-datagrid-border-horizontal);
  }

  .topbar-btn {
    display: inline-flex;
    align-items: center;
    height: 26px;
  }

  .topbar-btn:hover {
    background-color: var(--theme-datagrid-selected-cell-background);
  }

  .topbar-spacer {
    flex: 1;
  }

  table thead {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--theme-datagrid-headercell-background);
  }
</style>
