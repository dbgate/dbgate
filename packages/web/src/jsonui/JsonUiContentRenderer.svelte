<script lang="ts">
  import JsonUiHeading from './JsonUiHeading.svelte';
  import JsonUiLinkButton from './JsonUiLinkButton.svelte';
  import JsonUiTextBlock from './JsonUiTextBlock.svelte';
  import JsonUiTickList from './JsonUiTickList.svelte';
  import { JsonUiBlock } from './jsonuitypes';

  export let blocks: JsonUiBlock[] = [];

  const componentMap = {
    text: JsonUiTextBlock,
    heading: JsonUiHeading,
    ticklist: JsonUiTickList,
    button: JsonUiLinkButton,
  } as const;
</script>

{#each blocks as block, i}
  {#if block.type in componentMap}
    <svelte:component this={componentMap[block.type]} {...block} />
  {/if}
{/each}
