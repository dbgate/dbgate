<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { openWebLink } from '../utility/simpleTools';

  export let text: string;
  export let link: string;
  export let colorClass: string = '';
</script>

<div class="center">
  <FormStyledButton on:click={() => openWebLink(link)} value={text} skipWidth {colorClass} />
</div>

<style>
  .center {
    text-align: center;
  }
</style>
