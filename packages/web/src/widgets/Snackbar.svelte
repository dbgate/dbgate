<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import { onMount } from 'svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { openedSnackbars } from '../stores';

  export let message;
  export let id;
  export let icon = null;
  export let autoClose = false;
  export let allowClose = false;
  export let buttons = [];

  function handleClose() {
    openedSnackbars.update(x => x.filter(x => x.id != id));
  }

  onMount(() => {
    if (autoClose) setTimeout(handleClose, 3000);
  });

</script>

<div class="wrapper">
  <div class="message">
    <FontIcon {icon} />
    {message}
  </div>

  {#if allowClose}
    <div class="close" on:click={handleClose}>
      <FontIcon icon="icon close" />
    </div>
  {/if}

  {#if buttons?.length > 0}
    <div class="buttons">
      {#each buttons as button}
        <div class="button">
          <FormStyledButton value={button.label} on:click={button.onClick} />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrapper {
    width: 400px;
    border: 1px solid var(--theme-border);
    background-color: var(--theme-bg-2);
    margin: 10px;
    position: relative;
  }

  .message {
    margin: 10px;
  }

  .close {
    position: absolute;
    right: 5px;
    top: 5px;
    cursor: pointer;
  }

  .close:hover {
    color: var(--theme-font-hover);
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
  }

  .button {
    margin: 5px;
  }

</style>
