<script lang="ts">
  import FormStyledButton from '../widgets/FormStyledButton.svelte';
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const { submitActionRef } = getFormContext();
  
  submitActionRef.current = () => {
    dispatch('click');
  };
</script>

<FormStyledButton type="submit" on:click {...$$props} />
