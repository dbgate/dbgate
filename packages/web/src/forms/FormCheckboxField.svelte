<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FormCheckboxFieldRaw from './FormCheckboxFieldRaw.svelte';
  import { createEventDispatcher } from 'svelte';

  export let label;
  export let name;
  export let disabled = false;
  export let templateProps = {};

  const { template, setFieldValue, values } = getFormContext();
  const dispatch = createEventDispatcher();
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
          setFieldValue(name, $values?.[name] == 0 ? true : $values?.[name] == 1 ? false : !$values?.[name]);
          dispatch('change');
        },
      }}
>
  <FormCheckboxFieldRaw {name} {...$$restProps} {disabled} on:change />
</svelte:component>
