<script lang="ts">
  import _ from 'lodash';
  import { presetPrimaryColors } from '@ant-design/colors';
  import { presetPalettes, presetDarkPalettes } from '@ant-design/colors';
  import { currentThemeDefinition } from '../stores';
  import FontIcon from '../icons/FontIcon.svelte';
  import { createEventDispatcher } from 'svelte';

  export let value;
  export let disabled = false;

  function colorValue(color, colorIndex, themeDef) {
    const palettes = themeDef?.themeType == 'dark' ? presetDarkPalettes : presetPalettes;
    return palettes[color][colorIndex];
  }

  const dispatch = createEventDispatcher();
</script>

<div class="container">
  <div
    class="item"
    class:disabled
    class:selected={!value}
    on:click={() => {
      dispatch('change', null);
    }}
  >
    <FontIcon icon={value ? 'icon palette' : 'icon no-color'} />
  </div>
  {#each _.keys(presetPrimaryColors) as color}
    <div
      style={`background:${colorValue(color, 3, $currentThemeDefinition)}`}
      class="item"
      class:disabled
      class:selected={color == value}
      on:click={() => {
        if (disabled) return;
        dispatch('change', color);
      }}
    >
      <FontIcon icon={color == value ? 'icon check' : 'icon invisible-box'} />
    </div>
  {/each}
</div>

<style>
  .container {
    display: flex;
    align-content: stretch;
    height: 38px;
  }

  .item {
    flex-grow: 1;
    margin: 3px;
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    font-size: 12pt;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  .item:hover:not(.disabled) {
    border: 1px solid var(--theme-font-2);
  }

  .item.selected {
    border: 2px solid var(--theme-font-1);
    margin: 2px;
  }
</style>
