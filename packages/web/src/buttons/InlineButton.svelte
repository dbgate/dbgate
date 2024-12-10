<script lang="ts">
  export let disabled = false;
  export let square = false;
  export let narrow = false;
  export let title = null;

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
  on:click
  bind:this={domButton}
  data-testid={$$props['data-testid']}
>
  <div class="inner">
    <slot />
  </div>
</div>

<style>
  .outer {
    --bg-1: var(--theme-bg-1);
    --bg-2: var(--theme-bg-3);

    background: linear-gradient(to bottom, var(--bg-1) 5%, var(--bg-2) 100%);
    background-color: var(--bg-1);
    border: 1px solid var(--bg-2);
    display: inline-block;
    cursor: pointer;
    vertical-align: middle;
    color: var(--theme-font-1);
    font-size: 12px;
    padding: 3px;
    margin: 0;
    text-decoration: none;
    display: flex;
  }

  .narrow {
    padding: 3px 1px;
  }

  .outer.disabled {
    color: var(--theme-font-3);
  }

  .outer:hover:not(.disabled) {
    border: 1px solid var(--theme-font-1);
  }

  .outer:active:not(.disabled) {
    background: linear-gradient(to bottom, var(--bg-2) 5%, var(--bg-1) 100%);
    background-color: var(--bg-2);
  }

  .inner {
    margin: auto;
    flex: 1;
    text-align: center;
  }

  .square {
    width: 18px;
  }
</style>
