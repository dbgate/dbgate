<script>
  import WidgetContainer from './widgets/WidgetContainer.svelte';
  import WidgetIconPanel from './widgets/WidgetIconPanel.svelte';
  import {
    currentTheme,
    currentThemeDefinition,
    isFileDragActive,
    leftPanelWidth,
    openedSnackbars,
    selectedWidget,
    visibleWidgetSideBar,
    visibleCommandPalette,
    visibleTitleBar,
    visibleToolbar,
  } from './stores';
  import TabsPanel from './tabpanel/TabsPanel.svelte';
  import TabRegister from './tabpanel/TabRegister.svelte';
  import CommandPalette from './commands/CommandPalette.svelte';
  import Toolbar from './widgets/Toolbar.svelte';
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
  import TabsContainer from './tabpanel/TabsContainer.svelte';
  import MultiTabsContainer from './tabpanel/MultiTabsContainer.svelte';

  $: currentThemeType = $currentThemeDefinition?.themeType == 'dark' ? 'theme-type-dark' : 'theme-type-light';

  $: themeStyle = `<st` + `yle id="themePlugin">${$currentThemeDefinition?.themeCss}</st` + `yle>`;

  const isElectron = !!getElectron();
</script>

<svelte:head>
  {#if $currentThemeDefinition?.themeCss}
    {@html themeStyle}
  {/if}
</svelte:head>

<div class="not-supported" class:isElectron>
  <div class="m-5 big-icon"><FontIcon icon="img warn" /></div>
  <div class="m-3">Sorry, DbGate is not supported on mobile devices.</div>
  <div class="m-3">Please visit <a href="https://dbgate.org">DbGate web</a> for more info.</div>
</div>

<div
  class={`${$currentTheme} ${currentThemeType} root dbgate-screen`}
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
      class="horizontal-split-handle splitter"
      use:splitterDrag={'clientX'}
      on:resizeSplitter={e => leftPanelWidth.update(x => x + e.detail)}
    />
  {/if}
  {#if $visibleCommandPalette}
    <div class="commads">
      <CommandPalette />
    </div>
  {/if}
  {#if $visibleToolbar}
    <div class="toolbar">
      <Toolbar />
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
    color: var(--theme-font-1);
  }
  .iconbar {
    position: fixed;
    display: flex;
    left: 0;
    top: var(--dim-header-top);
    bottom: var(--dim-statusbar-height);
    width: var(--dim-widget-icon-size);
    background: var(--theme-bg-inv-1);
  }
  .statusbar {
    position: fixed;
    background: var(--theme-bg-statusbar-inv);
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
    background-color: var(--theme-bg-1);
    display: flex;
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

  .splitter {
    position: absolute;
    top: var(--dim-header-top);
    bottom: var(--dim-statusbar-height);
    left: calc(var(--dim-widget-icon-size) + var(--dim-left-panel-width));
  }

  .snackbar-container {
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
    right: 0;
    background-color: var(--theme-bg-1);
  }
</style>
