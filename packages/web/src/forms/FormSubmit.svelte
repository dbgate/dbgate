<script lang="ts">
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const { submitActionRef } = getFormContext();
  const { values } = getFormContext();

  function handleClick() {
    dispatch('click', $values);
  }

  submitActionRef.set(() => {
    handleClick();
  });
</script>

<FormStyledButton type="submit" on:click={handleClick} {...$$props} />
