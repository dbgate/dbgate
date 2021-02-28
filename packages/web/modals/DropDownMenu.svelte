<script>
  import clickOutside from '../src/utility/clickOutside';
  import { createEventDispatcher } from 'svelte';

  export let items;
  export let top;
  export let left;

  const dispatch = createEventDispatcher();

  function handleClick(item) {
    dispatch('close');
    if (item.onClick) item.onClick();
  }
</script>

<ul style={`left: ${left}px; top: ${top}px`} use:clickOutside on:clickOutside={() => dispatch('close')}>
  {#each items as item}
    {#if item.divider}
      <li class="divider" />
    {:else}
      <li>
        <a on:click={() => handleClick(item)}>
          {item.text}
          {#if item.keyText}
            <span class="keyText">{item.keyText}</span>
          {/if}
        </a>
      </li>
    {/if}
  {/each}
</ul>

<style>
  ul {
    position: absolute;
    list-style: none;
    background-color: #fff;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
    padding: 5px 0;
    margin: 2px 0 0;
    font-size: 14px;
    text-align: left;
    min-width: 160px;
    z-index: 1050;
    cursor: default;
  }

  .keyText {
    font-style: italic;
    font-weight: bold;
    text-align: right;
    margin-left: 16px;
  }

  a {
    padding: 3px 20px;
    line-height: 1.42;
    display: block;
    white-space: nop-wrap;
    color: #262626;
  }

  a:hover {
    background-color: #f5f5f5;
    text-decoration: none;
    color: #262626;
  }

  .divider {
    margin: 9px 0px 9px 0px;
    border-top: 1px solid #f2f2f2;
    border-bottom: 1px solid #fff;
  }
</style>
