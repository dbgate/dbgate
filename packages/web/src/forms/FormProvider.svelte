<script lang="ts">
  import { writable } from 'svelte/store';
  import FormProviderCore from './FormProviderCore.svelte';

  export let initialValues = {};
  export let template;

  const values = writable(initialValues);
</script>

<FormProviderCore {values} {template}>
  <slot />
</FormProviderCore>
