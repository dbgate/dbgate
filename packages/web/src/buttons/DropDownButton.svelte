<script lang="ts">
  import _ from 'lodash';

  import FontIcon from '../icons/FontIcon.svelte';
  import { currentDropDownMenu } from '../stores';
  import InlineButton from './InlineButton.svelte';

  export let icon = 'icon chevron-down';
  export let menu;
  export let asyncMenu = undefined;
  export let narrow = false;
  export let square = true;
  export let disabled = false;

  let domButton;
  let isLoading = false;

  async function handleClick() {
    if (disabled) return;

    let items = menu;

    if (asyncMenu) {
      isLoading = true;
      items = await asyncMenu();
      isLoading = false;
    }

    const rect = domButton.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    currentDropDownMenu.set({ left, top, items });
  }
</script>

<InlineButton
  {square}
  {narrow}
  on:click={handleClick}
  bind:this={domButton}
  {disabled}
  data-testid={$$props['data-testid']}
>
  <FontIcon icon={isLoading ? 'icon loading' : icon} />
</InlineButton>
