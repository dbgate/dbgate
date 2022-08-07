<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import { createEventDispatcher } from 'svelte';

  export let label;
  export let name;
  export let disabled = false;
  export let templateProps = {};
  export let checked: boolean;

  let refInput;

  const { template, setFieldValue, values } = getFormContext();
  const dispatch = createEventDispatcher();

  function handleChange() {
    dispatch('change', refInput.checked);
  }
</script>

<svelte:component
  this={template}
  type="checkbox"
  {label}
  {disabled}
  {...templateProps}
  labelProps={disabled
    ? { disabled: true }
    : {
        onClick: () => {
          dispatch('change', !refInput.checked);
        },
      }}
>
  <input bind:this={refInput} {checked} type="checkbox" {...$$restProps} on:change={handleChange} />
</svelte:component>
