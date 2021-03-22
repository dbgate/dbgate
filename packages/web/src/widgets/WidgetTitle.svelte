<div on:click>
  <slot />
</div>

<style>
  div {
    padding: 5px;
    font-weight: bold;
    text-transform: uppercase;
    background-color: var(--theme-bg-2);
    border: 1px solid var(--theme-border);
  }
  div:hover {
    background-color: var(--theme-bg-3);
  }
</style>
