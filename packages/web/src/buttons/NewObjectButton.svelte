<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let icon;
  export let title;
  export let description;
</script>

<div class="new-object-button" on:click>
  <div class="icon">
    <FontIcon {icon} />
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
    cursor: pointer;

    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .new-object-button:hover {
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
</style>
