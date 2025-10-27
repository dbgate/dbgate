<script lang="ts">
  import JsonUiCountdown from './JsonUiCountdown.svelte';
  import JsonUiHeading from './JsonUiHeading.svelte';
  import JsonUiHighlight from './JsonUiHighlight.svelte';
  import JsonUiLinkButton from './JsonUiLinkButton.svelte';
  import JsonUiMarkdown from './JsonUiMarkdown.svelte';
  import JsonUiTextBlock from './JsonUiTextBlock.svelte';
  import JsonUiTickList from './JsonUiTickList.svelte';
  import { JsonUiBlock } from './jsonuitypes';

  export let blocks: JsonUiBlock[] = [];
  export let passProps = {};

  const componentMap = {
    text: JsonUiTextBlock,
    heading: JsonUiHeading,
    ticklist: JsonUiTickList,
    button: JsonUiLinkButton,
    markdown: JsonUiMarkdown,
    highlight: JsonUiHighlight,
    countdown: JsonUiCountdown,
  } as const;
</script>

{#each blocks as block, i}
  {#if block.type in componentMap}
    <svelte:component this={componentMap[block.type]} {...block} {...passProps} />
  {/if}
{/each}
