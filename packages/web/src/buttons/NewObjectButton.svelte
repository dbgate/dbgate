<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import { isProApp } from '../utility/proTools';
  import { _t } from '../translations';

  export let icon;
  export let title;
  export let description;
  export let enabled;
  export let colorClass;
  export let disabledMessage = undefined;
  export let isProFeature;

  $: disabled = !enabled;
</script>

<div
  class="new-object-button"
  on:click
  class:enabled
  class:disabled
  data-testid={$$props['data-testid']}
  title={disabled
    ? isProFeature && !isProApp()
      ? _t('common.featurePremium', { defaultMessage: 'This feature is available only in DbGate Premium' })
      : disabledMessage
    : undefined}
>
  <div class="icon">
    <FontIcon {icon} colorClass={enabled ? colorClass : null} />
  </div>
  <span class="title">{title}</span>
  {#if description}
    <div class="description">{description}</div>
  {/if}
</div>

<style>
  .new-object-button {
  height: 114px;
  padding: 10px 8px;

  background-color: var(--theme-new-object-button-background);
  border: var(--theme-inlinebutton-bordered-border);
  border-radius: 6px;

  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.new-object-button.enabled {
  cursor: pointer;
}

.new-object-button.enabled:hover {
  background-color: var(--theme-new-object-button-background-hover);
}

.icon {
  font-size: 2.5em;
  margin: 6px 0 6px;
  color: var(--theme-generic-font);
}

.title {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
}

.description {
  font-size: 0.7rem;
  color: var(--theme-generic-font-grayed);
  line-height: 1.2;
  margin-top: 2px;
}

.new-object-button.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.new-object-button.disabled .icon,
.new-object-button.disabled .title,
.new-object-button.disabled .description {
  color: var(--theme-generic-font);
}
</style>
