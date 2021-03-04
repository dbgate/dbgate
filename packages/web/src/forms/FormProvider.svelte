<script lang="ts">
  import { writable } from 'svelte/store';
  import FormProviderCore from './FormProviderCore.svelte';

  export let initivalValues = {};

  const values = writable(initivalValues);
</script>

<FormProviderCore {values}>
  <slot />
</FormProviderCore>
