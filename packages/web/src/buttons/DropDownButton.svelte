<script lang="ts">
  import _ from 'lodash';

  import FontIcon from '../icons/FontIcon.svelte';
  import { currentDropDownMenu } from '../stores';
  import InlineButton from './InlineButton.svelte';

  export let icon = 'icon chevron-down';
  export let menu;
  export let narrow = false;
  let domButton;

  function handleClick() {
    const rect = domButton.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    currentDropDownMenu.set({ left, top, items: menu });
  }
</script>

<InlineButton square {narrow} on:click={handleClick} bind:this={domButton}>
  <FontIcon {icon} />
</InlineButton>
