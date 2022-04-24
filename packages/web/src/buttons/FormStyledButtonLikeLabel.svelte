<script lang="ts">
  export let disabled = false;
</script>

<label {...$$props} class:disabled>
  <slot />
</label>

<style>
  label {
    border: 1px solid var(--theme-bg-button-inv-2);
    padding: 4px;
    margin: 2px;
    width: 100px;
    background-color: var(--theme-bg-button-inv);
    color: var(--theme-font-inv-1);
    border-radius: 2px;
    position: relative;
    top: 3px;
  }

  label:hover:not(.disabled) {
    background-color: var(--theme-bg-button-inv-2);
  }
  label:active:not(.disabled) {
    background-color: var(--theme-bg-button-inv-3);
  }
  label.disabled {
    background-color: var(--theme-bg-button-inv-3);
    color: var(--theme-font-inv-3);
  }
</style>
