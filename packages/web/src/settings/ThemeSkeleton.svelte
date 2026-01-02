<script lang="ts">
  import type { ThemeDefinition } from 'dbgate-types';
  import FontIcon from '../icons/FontIcon.svelte';
  import { currentThemeDefinition, currentThemeType, getCompleteThemeVariables } from '../plugins/themes';
  import { apiCall } from '../utility/api';

  export let theme: ThemeDefinition;

  $: cssVarColors = Object.entries(getCompleteThemeVariables(theme))
    .map(([key, value]) => `${key}:${value}`)
    .join(';');

  async function handleApplyTheme() {
    if (theme.themePublicCloudPath) {
      const fileData = await apiCall('cloud/public-file-data', { path: theme.themePublicCloudPath });
      const themeJson = JSON.parse(fileData.text);
      $currentThemeDefinition = themeJson;
      return;
    }
    $currentThemeDefinition = theme;
  }
</script>

<div style={cssVarColors} class="container" on:click={handleApplyTheme}>
  <div class="iconbar">
    <div class="icon selected-icon">
      <FontIcon icon="icon database" />
    </div>
    <div class="icon"><FontIcon icon="icon file" /></div>
    <div class="icon"><FontIcon icon="icon history" /></div>
    <div class="icon"><FontIcon icon="icon archive" /></div>
    <div class="icon"><FontIcon icon="icon plugin" /></div>
  </div>

  <div class="titlebar" />

  <div class="content">
    {theme.themeName}<br />
    {theme.isBuiltInTheme ? '(built-in)' : theme.themePublicCloudPath ? '(cloud)' : '(file)'}
  </div>
</div>

<style>
  .container {
    position: relative;
    height: 150px;
    width: 200px;
    min-height: 150px;
    min-width: 200px;
    margin: 10px;
    cursor: pointer;
  }
  .iconbar {
    position: absolute;
    display: flex;
    flex-direction: column;
    left: 0;
    top: 0;
    bottom: 0;
    width: 30px;
    background: var(--theme-widget-panel-background);
    color: var(--theme-widget-panel-foreground);
  }
  .titlebar {
    left: 0;
    top: 0;
    right: 0;
    height: 10px;
    background: var(--theme-tabs-panel-background);
  }
  .content {
    position: absolute;
    display: flex;
    left: 30px;
    top: 10px;
    bottom: 0;
    right: 0;
    background: var(--theme-content-background);

    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-generic-font);
  }
  .icon {
    padding: 5px 0px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon:hover {
    color: var(--theme-widget-icon-foreground-hover);
  }
  .selected-icon {
    border-left: var(--theme-widget-icon-border-active);
    color: var(--theme-widget-icon-foreground-active);
    background: var(--theme-widget-icon-background-active);
  }
</style>
