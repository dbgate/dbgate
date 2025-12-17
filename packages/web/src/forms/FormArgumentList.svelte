<script lang="ts">
  import FormArgument from './FormArgument.svelte';

  export let namePrefix = '';
  export let args: any[];
  export let isReadOnly = false;
</script>

<div>
  {#each args as arg (arg.name)}
    <FormArgument {arg} {namePrefix} {isReadOnly} />
  {/each}
</div>
