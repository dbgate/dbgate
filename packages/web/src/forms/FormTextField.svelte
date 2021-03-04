<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FromTextFieldRaw from './FromTextFieldRaw.svelte';

  export let label;
  export let name;
  export let templateProps = {};

  const { template } = getFormContext();
</script>

<svelte:component this={template} type="text" {label} {...templateProps}>
  <FromTextFieldRaw {name} {...$$restProps} />
</svelte:component>
