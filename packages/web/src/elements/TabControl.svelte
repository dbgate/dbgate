<script lang="ts">
  import _ from 'lodash';
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import { _tval } from '../translations';

  interface TabDef {
    label: string;
    slot?: number;
    component?: any;
    props?: any;
    testid?: string;
    identifier?: string;
  }

  export let tabs: TabDef[];
  export let value: string | number = 0;
  export let menu = null;
  export let isInline = false;
  export let containerMaxWidth = undefined;
  export let containerMaxHeight = undefined;
  export let flex1 = true;
  export let flexColContainer = false;
  export let maxHeight100 = false;
  export let scrollableContentContainer = false;
  export let contentTestId = undefined;
  export let inlineTabs = false;
  export let onUserChange = null;

  export function setValue(index) {
    value = index;
  }
  export function getValue() {
    return value;
  }
</script>

<div class="main" class:maxHeight100 class:flex1>
  <div class="tabs" class:inlineTabs>
    {#each _.compact(tabs) as tab, index}
      <div
        class="tab-item"
        class:selected={value == (tab.identifier ?? index)}
        on:click={() => {
          value = tab.identifier ?? index;
          onUserChange?.(tab.identifier ?? index);
        }}
        data-testid={tab.testid}
      >
        <span class="ml-2 noselect">
          {_tval(tab.label)}
        </span>
      </div>
    {/each}
    {#if menu}
      <DropDownButton {menu} />
    {/if}
  </div>

  <div
    class="content-container"
    class:scrollableContentContainer
    style:max-height={containerMaxHeight}
    data-testid={contentTestId}
  >
    {#each _.compact(tabs) as tab, index}
      <div
        class="container"
        class:flexColContainer
        class:maxHeight100
        class:isInline
        class:tabVisible={(tab.identifier ?? index) == value}
        style:max-width={containerMaxWidth}
      >
        <svelte:component
          this={tab.component}
          {...tab.props}
          tabVisible={(tab.identifier ?? index) == value}
          tabControlHiddenTab={(tab.identifier ?? index) != value}
        />
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

  .main.maxHeight100 {
    max-height: 100%;
  }

  .tabs {
    display: flex;
    height: var(--dim-tabs-height);
    min-height: var(--dim-tabs-height);
    right: 0;
    overflow-x: auto;
    max-width: 100%;
  }

  .tabs:not(.inlineTabs) {
    background-color: var(--theme-bg-2);
  }

  .tabs.inlineTabs {
    border-bottom: 1px solid var(--theme-border);
    text-transform: uppercase;
  }

  .tabs.inlineTabs .tab-item.selected {
    border-bottom: 2px solid var(--theme-font-link);
  }
  .tabs::-webkit-scrollbar {
    height: 7px;
  }

  .tab-item {
    white-space: nowrap;
    padding-left: 15px;
    padding-right: 15px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .tabs:not(.inlineTabs) .tab-item {
    border-right: 1px solid var(--theme-border);
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

  .scrollableContentContainer {
    overflow-y: auto;
  }

  .container.maxHeight100 {
    max-height: 100%;
  }

  .container.flexColContainer {
    display: flex;
    flex-direction: column;
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
