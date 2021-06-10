<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FormCheckboxFieldRaw from './FormCheckboxFieldRaw.svelte';

  export let label;
  export let name;
  export let disabled = false;
  export let templateProps = {};

  const { template, setFieldValue, values } = getFormContext();

</script>

<svelte:component
  this={template}
  type="checkbox"
  {label}
  {disabled}
  {...templateProps}
  labelProps={disabled ? { disabled: true } : { onClick: () => setFieldValue(name, !$values[name]) }}
>
  <FormCheckboxFieldRaw {name} {...$$restProps} {disabled} />
</svelte:component>
