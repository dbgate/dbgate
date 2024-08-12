<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FormTextAreaFieldRaw from './FormTextAreaFieldRaw.svelte';

  export let label;
  export let name;
  export let templateProps = {};
  export let focused = false;

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="text" {label} {...templateProps}>
  <FormTextAreaFieldRaw {name} {...$$restProps} {focused} />
</svelte:component>
