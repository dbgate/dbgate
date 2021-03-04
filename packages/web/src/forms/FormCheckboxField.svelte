<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FromCheckboxFieldRaw from './FromTextFieldRaw.svelte';

  export let label;
  export let name;
  export let templateProps = {};

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="checkbox" {label} {...templateProps}>
  <FromCheckboxFieldRaw {name} {...$$restProps} />
</svelte:component>
