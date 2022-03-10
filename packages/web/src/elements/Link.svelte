<script lang="ts">
  import { openWebLink } from '../utility/exportFileTools';

  export let href = undefined;
  export let onClick = undefined;
</script>

<a
  on:click={() => {
    if (onClick) onClick();
    else openWebLink(href);
  }}
>
  <slot />
</a>

<style>
  a {
    text-decoration: none;
    cursor: pointer;
    color: var(--theme-font-link);
  }
  a:hover {
    text-decoration: underline;
  }
</style>
