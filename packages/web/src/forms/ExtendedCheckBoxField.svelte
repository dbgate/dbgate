<script lang="ts">
  export let value;

  // use for 3-state checkbox
  export let inheritedValue = null;

  export let onChange;

  export let label;

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
    onChange(getNextValue());
  }}
>
  <div class="checkbox" {...$$restProps} class:checked={!!renderedValue} class:isInherited />
  <div class="label">
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

  .checkbox {
    width: 14px !important;
    height: 14px !important;
    margin: 5px;
    -webkit-appearance: none;
    -moz-appearance: none;
    -o-appearance: none;
    appearance: none;
    outline: 1px solid var(--theme-border);
    box-shadow: none;
    font-size: 0.8em;
    text-align: center;
    line-height: 1em;
    background: var(--theme-bg-0);
  }

  .checked:after {
    content: '✔';
    color: var(--theme-font-1);
    font-weight: bold;
  }

  .isInherited {
    background: var(--theme-bg-2) !important;
  }
</style>
