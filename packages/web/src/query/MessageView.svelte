<script lang="ts">
  import { writable } from 'svelte/store';
  import MessageViewRow from './MessageViewRow.svelte';
  import RowsFilterSwitcher from '../forms/RowsFilterSwitcher.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import { filterName } from 'dbgate-tools';

  export let items: any[];
  export let showProcedure = false;
  export let showLine = false;
  export let showCaller = false;
  export let startLine = 0;
  export let onMessageClick = null;

  export let filter = '';

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
    <RowsFilterSwitcher
      icon="img debug"
      label="Debug"
      {values}
      field="hideDebug"
      count={items.filter(x => x.severity == 'debug').length}
    />
    <RowsFilterSwitcher
      icon="img info"
      label="Info"
      {values}
      field="hideInfo"
      count={items.filter(x => x.severity == 'info').length}
    />
    <RowsFilterSwitcher
      icon="img error"
      label="Error"
      {values}
      field="hideError"
      count={items.filter(x => x.severity == 'error').length}
    />
    <SearchInput placeholder="Filter log messages" bind:value={filter} />
  </div>
  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <td class="header">Number</td>
          <td class="header">Message</td>
          <td class="header">Time</td>
          <td class="header">Delta</td>
          <td class="header">Duration</td>
          {#if showProcedure}
            <td class="header">Procedure</td>
          {/if}
          {#if showLine}
            <td class="header">Line</td>
          {/if}
          {#if showCaller}
            <td class="header">Caller</td>
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
    background-color: var(--theme-bg-0);
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
  }
  .topbar {
    display: flex;
    width: 100%;
  }
  table thead {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--theme-bg-1);
  }
</style>
