<script lang="ts">
  import _ from 'lodash';
  import DropDownButton from '../buttons/DropDownButton.svelte';

  interface TabDef {
    label: string;
    slot?: number;
    component?: any;
    props?: any;
    testid?: string;
  }

  export let tabs: TabDef[];
  export let value = 0;
  export let menu = null;
  export let isInline = false;
  export let containerMaxWidth = undefined;
  export let flex1 = true;

  export function setValue(index) {
    value = index;
  }
  export function getValue() {
    return value;
  }
</script>

<div class="main" class:flex1>
  <div class="tabs">
    {#each _.compact(tabs) as tab, index}
      <div class="tab-item" class:selected={value == index} on:click={() => (value = index)} data-testid={tab.testid}>
        <span class="ml-2">
          {tab.label}
        </span>
      </div>
    {/each}
    {#if menu}
      <DropDownButton {menu} />
    {/if}
  </div>

  <div class="content-container">
    {#each _.compact(tabs) as tab, index}
      <div class="container" class:isInline class:tabVisible={index == value} style:max-width={containerMaxWidth}>
        <svelte:component this={tab.component} {...tab.props} tabControlHiddenTab={index != value} />
        {#if tab.slot != null}
          {#if tab.slot == 0}<slot name="0" />
          {:else if tab.slot == 1}<slot name="1" />
          {:else if tab.slot == 2}<slot name="2" />
          {:else if tab.slot == 3}<slot name="3" />
          {:else if tab.slot == 4}<slot name="4" />
          {:else if tab.slot == 5}<slot name="5" />
          {:else if tab.slot == 6}<slot name="6" />
          {:else if tab.slot == 7}<slot name="7" />
          {:else if tab.slot == 8}<slot name="8" />
          {:else if tab.slot == 9}<slot name="9" />
          {/if}
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .main {
    display: flex;
    flex-direction: column;
  }

  .main.flex1 {
    flex: 1;
    max-width: 100%;
  }

  .tabs {
    display: flex;
    height: var(--dim-tabs-height);
    min-height: var(--dim-tabs-height);
    right: 0;
    background-color: var(--theme-bg-2);
    overflow-x: auto;
    max-width: 100%;
  }

  .tabs::-webkit-scrollbar {
    height: 7px;
  }

  .tab-item {
    border-right: 1px solid var(--theme-border);
    padding-left: 15px;
    padding-right: 15px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  /* .tab-item:hover {
    color: ${props => props.theme.tabs_font_hover};
  } */
  .tab-item.selected {
    background-color: var(--theme-bg-1);
  }

  .content-container {
    flex: 1;
    position: relative;
  }

  .container:not(.isInline) {
    position: absolute;
    display: flex;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }

  .container:not(.tabVisible):not(.isInline) {
    visibility: hidden;
  }

  .container.isInline:not(.tabVisible) {
    display: none;
  }
</style>
