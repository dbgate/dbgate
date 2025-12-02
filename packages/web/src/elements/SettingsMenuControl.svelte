<script lang="ts">
  import _ from 'lodash';
  import HorizontalSplitter from './HorizontalSplitter.svelte';

  interface MenuItemDef {
    label: string;
    slot?: number;
    component?: any;
    props?: any;
    testid?: string;
    identifier?: string;
  }

  export let items: MenuItemDef[];
  export let value: string | number = 0;
  export let containerMaxWidth = undefined;
  export let containerMaxHeight = undefined;
  export let flex1 = true;
  export let flexColContainer = false;
  export let maxHeight100 = false;
  export let scrollableContentContainer = false;
  export let contentTestId = undefined;
  export let onUserChange = null;

  export function setValue(index) {
    value = index;
  }
  export function getValue() {
    return value;
  }
</script>

<div class="main" class:maxHeight100 class:flex1>
  <HorizontalSplitter initialValue="170px">
    <svelte:fragment slot="1">
      <div class="menu">
        {#each _.compact(items) as item, index}
          <div
            class="menu-item"
            class:selected={value == (item.identifier ?? index)}
            on:click={() => {
              value = item.identifier ?? index;
              onUserChange?.(item.identifier ?? index);
            }}
            data-testid={item.testid}
          >
            <span class="ml-2 noselect">
              {item.label}
            </span>
          </div>
        {/each}
      </div>
    </svelte:fragment>

    <svelte:fragment slot="2">
      <div
        class="content-container"
        class:scrollableContentContainer
        style:max-height={containerMaxHeight}
        data-testid={contentTestId}
      >
        {#each _.compact(items) as item, index}
          <div
            class="container"
            class:flexColContainer
            class:maxHeight100
            class:itemVisible={(item.identifier ?? index) == value}
            style:max-width={containerMaxWidth}
          >
            <svelte:component
              this={item.component}
              {...item.props}
              itemVisible={(item.identifier ?? index) == value}
              menuControlHiddenItem={(item.identifier ?? index) != value}
            />
          </div>
        {/each}
      </div>
    </svelte:fragment>
  </HorizontalSplitter>
</div>

<style>
  .main {
    display: flex;
    flex: 1;
  }

  .main.flex1 {
    flex: 1;
    max-height: 100%;
  }

  .main.maxHeight100 {
    max-height: 100%;
  }

  .menu {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--theme-bg-2);
    overflow-x: auto;
  }

  .menu::-webkit-scrollbar {
    width: 7px;
  }

  .menu-item {
    white-space: nowrap;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
    border-bottom: 1px solid var(--theme-border);
    transition: background-color 0.2s ease;
  }

  .menu-item:first-child {
    border-top: 1px solid var(--theme-border);
  }

  .menu-item:hover {
    background-color: var(--theme-bg-hover);
  }

  .menu-item.selected {
    background-color: var(--theme-bg-1);
    font-weight: 600;
    border-left: 3px solid var(--theme-font-link);
  }

  .content-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    height: 100%;
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

  .container {
    position: absolute;
    display: flex;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    overflow-y: auto;
    padding: 20px;
  }

  .container:not(.itemVisible) {
    visibility: hidden;
  }
</style>
