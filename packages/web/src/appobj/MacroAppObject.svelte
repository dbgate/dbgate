<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher =
    filter =>
    ({ name, title }) =>
      filterName(filter, name, title);
</script>

<script lang="ts">
  import { filterName } from 'dbgate-tools';
  import { getContext } from 'svelte';

  import AppObjectCore from './AppObjectCore.svelte';

  export let data;
  const selectedMacro = getContext('selectedMacro') as any;
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.title}
  icon="img macro"
  isBold={$selectedMacro?.name == data.name}
  on:click={() => ($selectedMacro = data)}
/>
