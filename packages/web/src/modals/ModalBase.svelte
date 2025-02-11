<script>
  import FontIcon from '../icons/FontIcon.svelte';
  import { closeModal, getActiveModalId } from './modalTools';
  import clickOutside from '../utility/clickOutside';
  import keycodes from '../utility/keycodes';
  import { onMount } from 'svelte';
  import { currentDropDownMenu } from '../stores';

  export let fullScreen = false;
  export let noPadding = false;
  export let simple = false;
  export let modalId;

  function handleCloseModal() {
    if (modalId == getActiveModalId()) {
      closeModal(modalId);
    }
  }

  function handleClickOutside() {
    if ($currentDropDownMenu) return;
    handleCloseModal();
  }

  function handleEscape(e) {
    if (e.keyCode == keycodes.escape) {
      handleCloseModal();
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
  <div class="window" class:fullScreen class:simple use:clickOutside on:clickOutside={handleClickOutside}>
    {#if $$slots.header}
      <div class="header" class:fullScreen>
        <div><slot name="header" /></div>
        <div class="close" on:click={handleCloseModal}>
          <FontIcon icon="icon close" />
        </div>
      </div>
    {/if}

    <div class="content" class:noPadding class:fullScreen>
      <slot />
    </div>

    {#if $$slots.footer}
      <div class="footer" class:fullScreen>
        <slot name="footer" />
      </div>
    {/if}
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
    border: 1px solid var(--theme-border);
    overflow: auto;
    outline: none;
    display: flex;
    flex-direction: column;
  }

  .window:not(.fullScreen):not(.simple) {
    border-radius: 10px;
    margin: auto;
    margin-top: 15vh;
    max-height: 70vh;
    width: 50%;
  }

  .window.fullScreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .window.simple {
    margin: auto;
    margin-top: 25vh;
    width: 30%;
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

  .header.fullScreen {
    border-bottom: 1px solid var(--theme-border);
  }

  .content {
    max-height: 100%;
    overflow-y: auto;
    flex-grow: 1;
  }

  .content:not(.fullScreen) {
    border-bottom: 1px solid var(--theme-border);
    border-top: 1px solid var(--theme-border);
  }

  .content:not(.noPadding):not(.fullScreen) {
    padding: 15px;
  }

  .content.fullScreen {
    display: flex;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 100px;
  }

  .footer:not(.fullScreen) {
    border-bottom: 1px solid var(--theme-border);
    padding: 15px;
    background-color: var(--theme-bg-modalheader);
  }

  .footer.fullScreen {
    position: fixed;
    height: 100px;
    left: 0;
    right: 0;
    bottom: 0px;
    border-top: 1px solid var(--theme-border);
    background-color: var(--theme-bg-modalheader);
  }
</style>
