<script lang="ts">
  import MessageViewRow from './MessageViewRow.svelte';

  export let items: any[];
  export let showProcedure = false;
  export let showLine = false;
  export let showCaller = false;
  export let startLine = 0;

  $: time0 = items[0] && new Date(items[0].time).getTime();

  // $: console.log('MESSAGE ROWS', items);
</script>

<div class="main">
  <table>
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
    {#each items as row, index}
      <MessageViewRow
        {row}
        {index}
        {showProcedure}
        {showLine}
        {showCaller}
        {time0}
        {startLine}
        previousRow={index > 0 ? items[index - 1] : null}
        on:messageclick
      />
    {/each}
  </table>
</div>

<style>
  .main {
    flex: 1;
    display: flex;
    position: relative;
    overflow-y: scroll;
    background-color: var(--theme-bg-0);
  }
  table {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    width: 100%;
    border-spacing: 0;
    border-collapse: collapse;
  }
</style>
