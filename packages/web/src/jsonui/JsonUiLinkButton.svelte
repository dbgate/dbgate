<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { openWebLink } from '../utility/simpleTools';

  export let text: string;
  export let link: string;
  export let colorClass: string = '';

  // very light url guard
  const safe = /^(https?:)?\/\//i.test(link) || link.startsWith('/');
</script>

<div class="center">
  <FormStyledButton on:click={() => openWebLink(link)} value={text} skipWidth {colorClass} />
</div>

<style>
  .center {
    text-align: center;
  }
</style>
