<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import SettingsCheckboxFieldRaw from './SettingsCheckboxFieldRaw.svelte';

  export let label;
  export let name;
  export let disabled = false;
  export let templateProps = {};

  const { template, setFieldValue, values } = getFormContext();
</script>

<svelte:component
  this={template}
  on:change
  type="checkbox"
  {label}
  {disabled}
  {...templateProps}
  labelProps={disabled ? { disabled: true } : { onClick: () => setFieldValue(name, !$values[name]) }}
>
  <SettingsCheckboxFieldRaw {name} {...$$restProps} {disabled} />
</svelte:component>
