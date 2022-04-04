<script lang="ts">
  import { openWebLink } from '../utility/exportFileTools';

  export let href = undefined;
  export let onClick = undefined;
</script>

<a
  on:click={(e) => {
    if (onClick) onClick(e);
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
