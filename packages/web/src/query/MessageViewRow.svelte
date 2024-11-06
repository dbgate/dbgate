<script lang="ts" context="module">
  function formatDuration(duration) {
    if (duration == 0) return '0';
    if (duration < 1000) {
      return `${Math.round(duration)} ms`;
    }
    if (duration < 10000) {
      return `${Math.round(duration / 100) / 10} s`;
    }
    return `${Math.round(duration / 1000)} s`;
  }
</script>

<script lang="ts">
  import moment from 'moment';
  import JSONTree from '../jsontree/JSONTree.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';

  export let row;
  export let index;
  export let showProcedure = false;
  export let showLine = false;
  export let showCaller = false;
  export let time0;
  export let startLine;

  export let previousRow = null;
  export let onMessageClick = null;

  let isExpanded = false;
</script>

<tr
  class:isError={row.severity == 'error'}
  class:isDebug={row.severity == 'debug'}
  class:isActive={row.line}
  on:click={() => onMessageClick?.(row)}
>
  <td>{index + 1}</td>
  <td>
    <span on:click={() => (isExpanded = !isExpanded)} class="expand-button">
      <FontIcon icon={plusExpandIcon(isExpanded)} />
    </span>
    {row.message}
  </td>
  <td>{moment(row.time).format('HH:mm:ss')}</td>
  <td>{formatDuration(new Date(row.time).getTime() - time0)}</td>
  <td> {previousRow ? formatDuration(new Date(row.time).getTime() - new Date(previousRow.time).getTime()) : 'n/a'}</td>
  {#if showProcedure}
    <td>{row.procedure || ''}</td>
  {/if}
  {#if showLine}
    <td>{row.line == null ? '' : row.line + 1 + startLine}</td>
  {/if}
  {#if showCaller}
    <td>{row.caller || ''}</td>
  {/if}
</tr>
{#if isExpanded}
  <tr>
    <td colspan={5 + (showProcedure ? 1 : 0) + (showLine ? 1 : 0) + (showCaller ? 1 : 0)}>
      <JSONTree
        value={row}
        expanded
        onRootExpandedChanged={() => {
          isExpanded = false;
        }}
      />
    </td>
  </tr>
{/if}

<style>
  .expand-button {
    cursor: pointer;
  }

  td.header {
    text-align: left;
    border-bottom: 2px solid var(--theme-border);
    background-color: var(--theme-bg-1);
    padding: 5px;
  }
  td:not(.header) {
    border-top: 1px solid var(--theme-border);
    padding: 5px;
  }
  tr.isActive {
    cursor: pointer;
  }
  tr.isActive:hover {
    background: var(--theme-bg-2);
  }
  tr.isError {
    color: var(--theme-icon-red);
  }
  tr.isDebug {
    color: var(--theme-font-3);
  }
</style>
