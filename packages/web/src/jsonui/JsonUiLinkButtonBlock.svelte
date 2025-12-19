<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { openWebLink } from '../utility/simpleTools';

  export let text: string;
  export let link: string;
  export let colorClass: string = '';
  export let items: any[] = [];
</script>

<div class="center">
  {#each items as item}
    <FormStyledButton on:click={() => openWebLink(item.link)} value={item.text} skipWidth {colorClass} />
  {/each}
</div>

<style>
  .center {
    text-align: center;
  }
</style>
