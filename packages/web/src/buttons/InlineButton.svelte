<script lang="ts">
  export let disabled = false;
  export let square = false;
  export let narrow = false;
  export let title = null;
  export let inlineBlock = false;
  export let useBorder = false;
  export let circleHover = false;

  let domButton;

  export function getBoundingClientRect() {
    return domButton.getBoundingClientRect();
  }
</script>

<div
  class="outer buttonLike"
  {title}
  class:disabled
  class:square
  class:narrow
  class:inlineBlock
  class:useBorder
  class:circleHover
  on:click
  on:mousedown
  bind:this={domButton}
  data-testid={$$props['data-testid']}
>
  <div class="inner">
    <slot />
  </div>
</div>

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

  .outer.circleHover:hover:not(.disabled) {
    border-radius: 50%;
    background-color: var(--theme-inlinebutton-circle-hover-background);
    width: 18px;
  }

  .outer:not(.useBorder) {
    font-size: 14px;
  }

  .outer.useBorder {
    --bg-1: var(--theme-bg-1);
    --bg-2: var(--theme-bg-3);

    background: var(--theme-inlinebutton-bordered-background);
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
    background: var(--theme-inlinebutton-bordered-hover-background);
  }

  .outer:hover:not(.disabled) {
    color: var(--theme-inlinebutton-foreground-hover);
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
