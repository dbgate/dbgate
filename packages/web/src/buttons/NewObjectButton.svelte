<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import { isProApp } from '../utility/proTools';

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
      ? 'This feature is available only in DbGate Premium'
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
    width: 150px;
    height: 150px;
    background-color: var(--theme-bg-1);
    border-radius: 4px;
    border: 1px solid var(--theme-border);

    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .new-object-button.enabled {
    cursor: pointer;
  }
  .new-object-button.enabled:hover {
    background-color: var(--theme-bg-2);
  }
  .icon {
    font-size: 3em;
    margin-top: 20px;
    color: var(--theme-font-1);
  }
  .title {
    margin-top: 0.2em;
    font-weight: bold;
  }
  .description {
    margin-top: 0.2em;
    margin-left: 0.5em;
    margin-right: 0.5em;
    font-size: 0.9em;
    color: var(--theme-font-2);
  }

  .new-object-button.disabled .title {
    color: var(--theme-font-2);
  }
  .new-object-button.disabled .description {
    color: var(--theme-font-2);
  }
  .new-object-button.disabled .icon {
    color: var(--theme-font-2);
  }
  .new-object-button.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
