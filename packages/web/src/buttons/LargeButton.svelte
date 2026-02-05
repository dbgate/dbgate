<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import { createEventDispatcher } from 'svelte';

  export let icon;
  export let disabled = false;
  export let fillHorizontal = false;

  const dispatch = createEventDispatcher();

  function handleClick() {
    if (!disabled) dispatch('click');
  }
</script>

<div class="button" on:click={handleClick} class:disabled class:fillHorizontal data-testid={$$props['data-testid']}>
  <div class="icon">
    <FontIcon {icon} />
  </div>
  <div class="inner">
    <slot />
  </div>
</div>

<style>
  .button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  color: var(--theme-toolstrip-button-foreground);
  border: var(--theme-toolstrip-button-border);
  width: 120px;
  height: 48px;
  background-color: var(--theme-toolstrip-button-background);
  border-radius: 10px;
  cursor: pointer;
}

.button.fillHorizontal {
  width: auto;
  margin: 0px 10px;
  padding: 0;
}

.button:not(.disabled):hover {
  background-color: var(--theme-toolstrip-button-background-hover);
  border: var(--theme-toolstrip-button-border-hover);
}

.button:not(.disabled):active {
  background-color: var(--theme-toolstrip-button-background-active);
  border: var(--theme-toolstrip-button-border);
  transform: translateY(1px);
}

.button.disabled {
  color: var(--theme-toolstrip-button-foreground-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0;
}

.inner {
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
}
</style>
