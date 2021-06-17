<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FormDropDownTextFieldRaw from './FormDropDownTextFieldRaw.svelte';

  export let label;
  export let name;
  export let templateProps = {};

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="text" {label} {...templateProps}>
  <FormDropDownTextFieldRaw {name} {...$$restProps} />
</svelte:component>
