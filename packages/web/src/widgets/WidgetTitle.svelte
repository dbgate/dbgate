<div on:click>
  <slot />
</div>

<style>
  div {
    padding: 5px;
    font-weight: bold;
    text-transform: uppercase;
    background-color: var(--theme-bg-1);
    border: 2px solid var(--theme-border);
  }
  div:hover {
    background-color: var(--theme-bg-2);
  }
</style>
