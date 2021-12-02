<script>
  import _ from 'lodash';
  import { currentDropDownMenu } from '../stores';
  import DropDownMenu from './DropDownMenu.svelte';
</script>

{#if $currentDropDownMenu}
  <DropDownMenu
    left={$currentDropDownMenu.left}
    top={$currentDropDownMenu.top}
    items={$currentDropDownMenu.items}
    targetElement={$currentDropDownMenu.targetElement}
    on:close={() => ($currentDropDownMenu = null)}
  />
{/if}
