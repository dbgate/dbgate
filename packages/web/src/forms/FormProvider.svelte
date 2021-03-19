<script lang="ts">
  import { writable } from 'svelte/store';
  import FormFieldTemplateLarge from './FormFieldTemplateLarge.svelte';
  import FormProviderCore from './FormProviderCore.svelte';

  export let initialValues = {};
  export let template = FormFieldTemplateLarge;

  const values = writable(initialValues);
</script>

<FormProviderCore {values} {template}>
  <slot />
</FormProviderCore>
