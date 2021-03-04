<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FromCheckboxFieldRaw from './FromCheckboxFieldRaw.svelte';

  export let label;
  export let name;
  export let disabled;
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
  <FromCheckboxFieldRaw {name} {...$$restProps} {disabled} />
</svelte:component>
