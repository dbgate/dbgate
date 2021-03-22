<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher = ({ name, title }) => filter => filterName(filter, name, title);
</script>

<script lang="ts">
  import { filterName } from 'dbgate-datalib';
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
