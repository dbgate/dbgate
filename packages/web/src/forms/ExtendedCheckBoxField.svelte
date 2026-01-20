<script lang="ts">
  export let value;

  // use for 3-state checkbox
  export let inheritedValue = null;

  export let onChange;

  export let label;

  export let disabled = false;

  $: renderedValue = value ?? inheritedValue;
  $: isInherited = inheritedValue != null && value == null;

  function getNextValue() {
    if (inheritedValue != null) {
      // 3-state logic
      if (isInherited) {
        return true;
      }
      if (renderedValue) {
        return false;
      }
      return null;
    }

    return !value;
  }
</script>

<div
  class="wrapper"
  on:click|preventDefault|stopPropagation={() => {
    if (disabled) return;
    onChange(getNextValue());
  }}
>
  <div class="checkbox" {...$$restProps} class:checked={!!renderedValue} class:isInherited class:disabled />
  <div class="label" class:disabled>
    {label}
  </div>
</div>

<style>
  .wrapper {
    display: flex;
    align-items: center;
    margin: 4px;
    cursor: pointer;
  }

  .label {
    user-select: none;
  }

  .label.disabled {
    cursor: not-allowed;
    color: var(--theme-input-foreground-disabled);
  }

  .checkbox {
    width: 14px !important;
    height: 14px !important;
    margin: 5px;
    -webkit-appearance: none;
    -moz-appearance: none;
    -o-appearance: none;
    appearance: none;
    outline: var(--theme-input-border);
    box-shadow: none;
    font-size: 0.8em;
    text-align: center;
    line-height: 1em;
    background: var(--theme-input-background);
  }

  .checked:after {
    content: '✔';
    color: var(--theme-input-foreground);
    font-weight: bold;
  }

  .isInherited {
    background: var(--theme-checkbox-background-inherited) !important;
  }

  .checkbox.disabled {
    background: var(--theme-input-background-disabled) !important;
    cursor: not-allowed;
  }
</style>
