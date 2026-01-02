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
    --bg-1: var(--theme-bg-1);
    --bg-2: var(--theme-bg-3);

    background: linear-gradient(to bottom, var(--bg-1) 5%, var(--bg-2) 100%);
    background-color: var(--bg-1);
    border: 1px solid var(--bg-2);
  }

  .narrow {
    padding: 3px 1px;
  }

  .outer.disabled {
    color: var(--theme-inlinebutton-foreground-disabled);
  }

  .outer.useBorder:hover:not(.disabled) {
    border: 1px solid var(--theme-font-1);
  }

  .outer:hover:not(.disabled) {
    color: var(--theme-inlinebutton-foreground-hover);
  }

  .outer.useBorder:active:not(.disabled) {
    background: linear-gradient(to bottom, var(--bg-2) 5%, var(--bg-1) 100%);
    background-color: var(--bg-2);
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
