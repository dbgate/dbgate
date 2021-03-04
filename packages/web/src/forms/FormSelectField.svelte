<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FromSelectFieldRaw from './FromSelectFieldRaw.svelte';

  export let label;
  export let name;
  export let templateProps = {};

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="select" {label} {...templateProps}>
  <FromSelectFieldRaw {name} {...$$restProps} />
</svelte:component>
