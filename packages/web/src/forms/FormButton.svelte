<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const { values } = getFormContext();

  function handleClick() {
    dispatch('click', $values);
  }
</script>

<FormStyledButton type="button" on:click={handleClick} {...$$props} />
