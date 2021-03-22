<script lang="ts">
  import FormElectronFileSelectorRaw from './FormElectronFileSelectorRaw.svelte';
  import { getFormContext } from './FormProviderCore.svelte';

  export let label;
  export let name;
  export let templateProps = {};

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="select" {label} {...templateProps}>
  <FormElectronFileSelectorRaw {name} {...$$restProps} />
</svelte:component>
