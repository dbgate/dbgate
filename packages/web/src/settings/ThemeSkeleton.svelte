<script lang="ts">
  import { ThemeDefinition } from 'dbgate-types';
  import FontIcon from '../icons/FontIcon.svelte';
  import { currentTheme } from '../stores';

  export let theme: ThemeDefinition;
  // export let theme;

  function getThemeStyle(val: ThemeDefinition) {
    return `<style id="themePlugin">${val.themeCss}</style>`;
  }
</script>

{#if theme.themeCss}
  {@html getThemeStyle(theme)}
{/if}

<div
  style={theme?.themeCss || ''}
  class={`container ${theme.themeClassName}`}
  on:click={() => {
    $currentTheme = theme.themeClassName;
  }}
>
  <div class="iconbar">
    <div class="icon">
      <FontIcon icon="icon database" />
    </div>
    <div class="icon"><FontIcon icon="icon file" /></div>
    <div class="icon"><FontIcon icon="icon history" /></div>
    <div class="icon"><FontIcon icon="icon archive" /></div>
    <div class="icon"><FontIcon icon="icon plugin" /></div>
  </div>

  <div class="titlebar" />

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
  .iconbar {
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
  .titlebar {
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
