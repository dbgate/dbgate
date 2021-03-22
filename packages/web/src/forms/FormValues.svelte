<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';

  const { values } = getFormContext();
</script>

<slot values={$values} />
