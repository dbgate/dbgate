<script lang="ts">
  import FormArgument from './FormArgument.svelte';

  export let namePrefix = '';
  export let args: any[];
</script>

<div>
  {#each args as arg (arg.name)}
    <FormArgument {arg} {namePrefix} />
  {/each}
</div>
