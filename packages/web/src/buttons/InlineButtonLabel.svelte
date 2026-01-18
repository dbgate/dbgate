<script lang="ts">
  export let disabled = false;
  export let square = false;
  export let narrow = false;
  export let title = null;
  export let useBorder = false;

  let domButton;

  export function getBoundingClientRect() {
    return domButton.getBoundingClientRect();
  }
</script>

<label
  class="outer buttonLike"
  {title}
  class:disabled
  class:square
  class:narrow
  on:click
  bind:this={domButton}
  {...$$restProps}
>
  <div class="inner">
    <slot />
  </div>
</label>

<style>
  .outer {
    display: inline-block;
    cursor: pointer;
    vertical-align: middle;
    color: var(--theme-inlinebutton-foreground);
    font-size: 12px;
    padding: 3px;
    margin: 0;
    text-decoration: none;
    display: flex;
  }

  .outer:not(.useBorder) {
    font-size: 14px;
  }

  .outer.useBorder {
    background-color: var(--theme-inlinebutton-bordered-background);
    border: var(--theme-inlinebutton-bordered-border);
  }

  .narrow {
    padding: 3px 1px;
  }

  .outer.disabled {
    color: var(--theme-inlinebutton-foreground-disabled);
  }

  .outer.useBorder:hover:not(.disabled) {
    border: var(--theme-inlinebutton-bordered-hover-border);
  }

  .outer:hover:not(.disabled) {
    color: var(--theme-inlinebutton-foreground-hover);
  }

  .outer.useBorder:active:not(.disabled) {
    border: var(--theme-inlinebutton-bordered-hover-border);
    background: var(--theme-inlinebutton-bordered-hover-background);
  }

  .inner {
    margin: auto;
    flex: 1;
    text-align: center;
  }

  .square.useBorder {
    width: 18px;
  }

  .inlineBlock {
    display: inline-block;
  }
</style>
