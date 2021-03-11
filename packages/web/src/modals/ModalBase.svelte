<script>
  import FontIcon from '../icons/FontIcon.svelte';
  import { closeModal } from './modalTools';
  import clickOutside from '../utility/clickOutside';
  import keycodes from '../utility/keycodes';
  import { onMount } from 'svelte';

  export let fullScreen = false;
  export let noPadding = false;
  export let modalId;

  function handleCloseModal() {
    closeModal(modalId);
  }

  function handleEscape(e) {
    if (e.keyCode == keycodes.escape) {
      closeModal(modalId);
    }
  }

  onMount(() => {
    const oldFocus = document.activeElement;
    return () => {
      if (oldFocus) oldFocus.focus();
    };
  });
</script>

<!-- The Modal -->
<div id="myModal" class="bglayer">
  <!-- Modal content -->
  <div class="window" class:fullScreen use:clickOutside on:clickOutside={handleCloseModal}>
    <div class="header">
      <div><slot name="header" /></div>
      <div class="close" on:click={handleCloseModal}>
        <FontIcon icon="icon close" />
      </div>
    </div>
    <div class="content" class:noPadding>
      <slot />
    </div>
    <div class="footer">
      <slot name="footer" />
    </div>
  </div>
</div>

<svelte:window on:keydown={handleEscape} />

<style>
  .bglayer {
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgb(0, 0, 0); /* Fallback color */
    background-color: rgba(0, 0, 0, 0.4);
  }

  .window {
    background-color: var(--theme-bg-0);
    margin: auto;
    margin-top: 15vh;
    border: 1px solid var(--theme-border);
    width: 50%;
    overflow: auto;
    outline: none;
  }

  .window:not(.fullScreen) {
    border-radius: 10px;
  }

  .close {
    font-size: 12pt;
    padding: 5px 10px;
    border-radius: 10px;
  }

  .close:hover {
    background-color: var(--theme-bg-2);
  }

  .header {
    font-size: 15pt;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    background-color: var(--theme-bg-modalheader);
  }

  .content {
    border-bottom: 1px solid var(--theme-border);
    border-top: 1px solid var(--theme-border);
  }

  .content:not(.noPadding) {
    padding: 15px;
  }

  .footer {
    border-bottom: 1px solid var(--theme-border);
    padding: 15px;
    background-color: var(--theme-bg-modalheader);
  }
</style>
