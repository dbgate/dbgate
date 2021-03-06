<script lang="ts">
  import _ from 'lodash';

  import FontIcon from '../icons/FontIcon.svelte';
  import { currentDropDownMenu } from '../stores';
  import InlineButton from './InlineButton.svelte';

  export let icon = 'icon chevron-down';
  export let menu;
  let domButton;

  function handleClick() {
    const rect = domButton.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    currentDropDownMenu.set({ left, top, items: _.isFunction(menu) ? menu() : menu });
  }
</script>

<InlineButton square on:click={handleClick} bind:this={domButton}>
  <FontIcon {icon} />
</InlineButton>
