<script lang="ts">
  import _ from 'lodash';
  import { presetPrimaryColors } from '@ant-design/colors';
  import FontIcon from '../icons/FontIcon.svelte';
  import { createEventDispatcher } from 'svelte';

  export let value;
  export let disabled = false;

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
      style={`background: var(--theme-usercolor-background-${color})`}
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
    border: var(--theme-input-border);
    border-radius: 4px;
    font-size: 12pt;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  .item:hover:not(.disabled) {
    border: var(--theme-input-border-hover);
  }

  .item.selected {
    border: var(--theme-color-selected-border);
    margin: 2px;
  }
</style>
