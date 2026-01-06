<script>
  import WidgetContainer from './widgets/WidgetContainer.svelte';
  import WidgetIconPanel from './widgets/WidgetIconPanel.svelte';
  import {
    isFileDragActive,
    leftPanelWidth,
    openedSnackbars,
    selectedWidget,
    visibleWidgetSideBar,
    visibleCommandPalette,
    visibleTitleBar,
    rightPanelWidget,
    rightPanelWidth,
  } from './stores';
  import CommandPalette from './commands/CommandPalette.svelte';
  import splitterDrag from './utility/splitterDrag';
  import CurrentDropDownMenu from './modals/CurrentDropDownMenu.svelte';
  import StatusBar from './widgets/StatusBar.svelte';
  import Snackbar from './widgets/Snackbar.svelte';
  import ModalLayer from './modals/ModalLayer.svelte';
  import DragAndDropFileTarget from './DragAndDropFileTarget.svelte';
  import dragDropFileTarget from './utility/dragDropFileTarget';
  import TitleBar from './widgets/TitleBar.svelte';
  import FontIcon from './icons/FontIcon.svelte';
  import getElectron from './utility/getElectron';
  import MultiTabsContainer from './tabpanel/MultiTabsContainer.svelte';
  import { currentThemeType } from './plugins/themes';
  import RightWidgetContainer from './widgets/RightWidgetContainer.svelte';

  $: currentThemeTypeClass = $currentThemeType == 'dark' ? 'theme-type-dark' : 'theme-type-light';

  const isElectron = !!getElectron();
</script>

<div class="not-supported" class:isElectron>
  <div class="m-5 big-icon"><FontIcon icon="img warn" /></div>
  <div class="m-3">Sorry, DbGate is not supported on mobile devices.</div>
  <div class="m-3">Please visit <a href="https://dbgate.org">DbGate web</a> for more info.</div>
</div>

<div
  class={`${currentThemeTypeClass} root dbgate-screen`}
  class:isElectron
  use:dragDropFileTarget
  on:contextmenu={e => e.preventDefault()}
>
  {#if $visibleTitleBar}
    <div class="titlebar">
      <TitleBar />
    </div>
  {/if}
  <div class="iconbar">
    <WidgetIconPanel />
  </div>
  <div class="statusbar">
    <StatusBar />
  </div>
  {#if $selectedWidget && $visibleWidgetSideBar}
    <div class="leftpanel">
      <WidgetContainer />
    </div>
  {/if}
  <div class="tabs-container">
    <MultiTabsContainer />
  </div>
  {#if $selectedWidget && $visibleWidgetSideBar}
    <div
      class="horizontal-split-handle left-splitter"
      use:splitterDrag={'clientX'}
      on:resizeSplitter={e => leftPanelWidth.update(x => x + e.detail)}
    />
  {/if}
  {#if $rightPanelWidget}
    <div
      class="horizontal-split-handle right-splitter"
      use:splitterDrag={'clientX'}
      on:resizeSplitter={e => rightPanelWidth.update(x => x - e.detail)}
    />
  {/if}
  {#if $rightPanelWidget}
    <div class="rightpanel">
      <RightWidgetContainer />
    </div>
  {/if}
  {#if $visibleCommandPalette}
    <div class="commads">
      <CommandPalette />
    </div>
  {/if}
  <CurrentDropDownMenu />
  <ModalLayer />
  {#if $isFileDragActive}
    <DragAndDropFileTarget />
  {/if}
  <div class="snackbar-container">
    {#each $openedSnackbars as snackbar (snackbar.id)}
      <Snackbar {...snackbar} />
    {/each}
  </div>
</div>

<style>
  .root {
    color: var(--theme-generic-font);
  }
  .iconbar {
    position: fixed;
    display: flex;
    left: 0;
    top: var(--dim-header-top);
    bottom: var(--dim-statusbar-height);
    width: var(--dim-widget-icon-size);
    background: var(--theme-widget-panel-background);
  }
  .statusbar {
    position: fixed;
    background: var(--theme-statusbar-background);
    height: var(--dim-statusbar-height);
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
  }
  .leftpanel {
    position: fixed;
    top: var(--dim-header-top);
    left: var(--dim-widget-icon-size);
    bottom: var(--dim-statusbar-height);
    width: var(--dim-left-panel-width);
    background-color: var(--theme-sidebar-background);
    color: var(--theme-sidebar-foreground);
    display: flex;
    border-right: var(--theme-sidebar-border);
  }

  .rightpanel {
    position: fixed;
    top: var(--dim-header-top);
    right: 0;
    bottom: var(--dim-statusbar-height);
    width: var(--dim-right-panel-width);
    background-color: var(--theme-altsidebar-background);
    color: var(--theme-altsidebar-foreground);
    display: flex;
    border-left: var(--theme-altsidebar-border);
  }
  .commads {
    position: fixed;
    top: var(--dim-header-top);
    left: var(--dim-widget-icon-size);
  }
  .toolbar {
    position: fixed;
    top: var(--dim-toolbar-top);
    height: var(--dim-toolbar-height);
    left: 0;
    right: 0;
    background: var(--theme-bg-1);
  }

  .left-splitter {
    position: absolute;
    top: var(--dim-header-top);
    bottom: var(--dim-statusbar-height);
    left: calc(var(--dim-widget-icon-size) + var(--dim-left-panel-width));
  }

  .right-splitter {
    position: absolute;
    top: var(--dim-header-top);
    bottom: var(--dim-statusbar-height);
    right: var(--dim-content-right);
  }

  .snackbar-container {
    z-index: 1000;
    position: fixed;
    right: 0;
    bottom: var(--dim-statusbar-height);
  }

  .titlebar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--dim-titlebar-height);
  }

  .not-supported {
    display: none;
  }

  @media only screen and (max-width: 600px) {
    .dbgate-screen:not(.isElectron) {
      display: none;
    }

    .not-supported:not(.isElectron) {
      display: block;
    }
  }

  .not-supported {
    text-align: center;
  }
  .big-icon {
    font-size: 20pt;
  }

  .tabs-container {
    position: fixed;
    top: var(--dim-header-top);
    left: var(--dim-content-left);
    bottom: var(--dim-statusbar-height);
    right: var(--dim-content-right);
    background-color: var(--theme-content-background);
  }
</style>
