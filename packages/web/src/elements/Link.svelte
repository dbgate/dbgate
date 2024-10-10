<script lang="ts">
  import { openWebLink } from '../utility/exportFileTools';
  import contextMenu from '../utility/contextMenu';
  import { internalRedirectTo } from '../clientAuth';

  export let href = undefined;
  export let onClick = undefined;
  export let menu = '__no_menu';
  export let internalRedirect = undefined;
</script>

<a
  on:click={e => {
    if (onClick) onClick(e);
    else if (internalRedirect) internalRedirectTo(internalRedirect);
    else openWebLink(href);
  }}
  use:contextMenu={menu}
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
