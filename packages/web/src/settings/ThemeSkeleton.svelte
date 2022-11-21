<script lang="ts">
  import type { ThemeDefinition } from 'dbgate-types';
  import FontIcon from '../icons/FontIcon.svelte';
  import { currentTheme } from '../stores';
  import _ from 'lodash';

  function extractThemeColors(theme: ThemeDefinition) {
    if (!theme.themeCss) return {};

    return _.fromPairs(
      [...theme.themeCss.matchAll(/(--theme-[a-z0-9\-]+)\s*\:\s*(\#[0-9a-fA-F]{6})/g)].map(x => [x[1], x[2]])
    );
  }

  export let theme: ThemeDefinition;

  $: colors = extractThemeColors(theme);
  $: cssVarColors = Object.entries(colors)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
</script>

<div
  style={cssVarColors}
  class={`container ${theme.themeClassName}`}
  on:click={() => {
    $currentTheme = theme.themeClassName;
  }}
>
  <div class="iconbar-settings-modal">
    <div class="icon">
      <FontIcon icon="icon database" />
    </div>
    <div class="icon"><FontIcon icon="icon file" /></div>
    <div class="icon"><FontIcon icon="icon history" /></div>
    <div class="icon"><FontIcon icon="icon archive" /></div>
    <div class="icon"><FontIcon icon="icon plugin" /></div>
  </div>

  <div class="titlebar-settings-modal" />

  <div class="content">
    <div class:current={$currentTheme == theme.themeClassName}>
      {theme.themeName}
    </div>
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
  .iconbar-settings-modal {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    left: 0;
    top: 0;
    bottom: 0;
    width: 30px;
    background: var(--theme-bg-inv-1);
    color: var(--theme-font-inv-2);
  }
  .titlebar-settings-modal {
    left: 0;
    top: 0;
    right: 0;
    height: 10px;
    background: var(--theme-bg-2);
  }
  .content {
    position: absolute;
    display: flex;
    left: 30px;
    top: 10px;
    bottom: 0;
    right: 0;
    background: var(--theme-bg-1);

    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-font-1);
  }
  .current {
    font-weight: bold;
  }
  .icon {
    margin: 5px 0px;
  }
</style>
