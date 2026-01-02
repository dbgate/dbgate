<script lang="ts">
  export let disabled = false;
</script>

<label {...$$props} class:disabled>
  <slot />
</label>

<style>
  label {
    border: var(--theme-formbutton-border);
    padding: 4px;
    margin: 2px;
    width: 100px;
    background: var(--theme-formbutton-background);
    color: var(--theme-formbutton-foreground);
    border-radius: 2px;
    position: relative;
    top: 3px;
    font-size: 10pt;
  }

  label:hover:not(.disabled) {
    background: var(--theme-formbutton-background-hover);
  }
  label:active:not(.disabled) {
    background: var(--theme-formbutton-background-active);
  }
  label.disabled {
    background: var(--theme-formbutton-background-disabled);
    color: var(--theme-formbutton-foreground-disabled);
  }
</style>
