<script lang="ts">
  export let disabled = false;
  export let square = false;
</script>

<div class="outer buttonLike" class:disabled class:square>
  <div class="inner">
    <slot />
  </div>
</div>

<style>
  .outer {
    background: linear-gradient(to bottom, var(--theme-bg-2) 5%, var(--theme-bg-3) 100%);
    background-color: var(--theme-bg-2);
    border: 1px solid var(--theme-bg-3);
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

  .outer.disabled {
    color: var(--theme-font-3);
  }

  .outer:hover:not(.disabled) {
    border: 1px solid var(--theme-bg-2);
    background: linear-gradient(to bottom, var(--theme-bg-3) 5%, var(--theme-bg-2) 100%);
    background-color: var(--theme-bg-3);
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
