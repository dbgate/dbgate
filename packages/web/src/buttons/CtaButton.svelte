<script lang="ts">
  export let disabled = false;
  export let title = null;

  let domButton;

  export function getBoundingClientRect() {
    return domButton.getBoundingClientRect();
  }
</script>

<button
  class="cta-button"
  {title}
  {disabled}
  on:click
  bind:this={domButton}
  data-testid={$$props['data-testid']}
>
  <slot />
</button>

<style>
  .cta-button {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    color: var(--theme-font-link);
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
    font-family: inherit;
    display: inline;
  }

  .cta-button:hover:not(:disabled) {
    color: var(--theme-font-hover);
  }

  .cta-button:disabled {
    color: var(--theme-font-3);
    cursor: not-allowed;
    text-decoration: none;
  }
</style>
