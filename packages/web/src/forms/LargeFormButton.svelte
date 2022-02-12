<script>
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';
  import LargeButton from '../buttons/LargeButton.svelte';

  const dispatch = createEventDispatcher();

  const { values } = getFormContext();

  function handleClick() {
    dispatch('click', $values);
  }
</script>

<LargeButton on:click={handleClick} {...$$props}>
  <slot />
</LargeButton>
