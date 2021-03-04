<script lang="ts">
  import FormStyledButton from '../widgets/FormStyledButton.svelte';
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const { submitActionRef } = getFormContext();
  const { values } = getFormContext();

  function handleClick() {
    dispatch('click', $values);
  }

  submitActionRef.current = () => {
    handleClick();
  };
</script>

<FormStyledButton type="submit" on:click={handleClick} {...$$props} />
