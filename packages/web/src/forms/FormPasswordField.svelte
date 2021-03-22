<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FormPasswordFieldRaw from './FormPasswordFieldRaw.svelte';

  export let label;
  export let name;
  export let templateProps = {};

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="text" {label} {...templateProps}>
  <FormPasswordFieldRaw {name} {...$$restProps} />
</svelte:component>
