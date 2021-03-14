<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FormSelectFieldRaw from './FormSelectFieldRaw.svelte';

  export let label;
  export let name;
  export let templateProps = {};

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="select" {label} {...templateProps}>
  <FormSelectFieldRaw {name} {...$$restProps} on:change />
</svelte:component>
