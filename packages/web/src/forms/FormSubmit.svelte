<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';

  export let disabled = false;

  const dispatch = createEventDispatcher();

  const { submitActionRef } = getFormContext();
  const { values } = getFormContext();

  function handleClick() {
    dispatch('click', $values);
  }

  submitActionRef.set(() => {
    if (!disabled) {
      handleClick();
    }
  });
</script>

<FormStyledButton type="submit" {disabled} on:click={handleClick} {...$$props} />
