<script>
  import { getContext, setContext } from 'svelte';
  import JSONArrow from './JSONArrow.svelte';
  import JSONNode from './JSONNode.svelte';
  import JSONKey from './JSONKey.svelte';

  export let key, value, isParentExpanded, isParentArray;
  export let expanded = false;

  $: stack = value.stack.split('\n');

  const context = getContext('json-tree-context-key');
  setContext('json-tree-context-key', { ...context, colon: ':' })

  $: if (!isParentExpanded) {
    expanded = false;
  }

  function toggleExpand() {
    expanded = !expanded;
  }
</script>
<style>
  li {
    user-select: text;
    word-wrap: break-word;
    word-break: break-all;
  }
  .indent {
    padding-left: var(--li-identation);
  }
  .collapse {
    --li-display: inline;
    display: inline;
    font-style: italic;
  }
</style>
<li class:indent={isParentExpanded}>
  {#if isParentExpanded}
    <JSONArrow on:click={toggleExpand} {expanded} />
  {/if}
  <JSONKey {key} colon={context.colon} {isParentExpanded} {isParentArray} />
  <span on:click={toggleExpand}>Error: {expanded?'':value.message}</span>
  {#if isParentExpanded}
    <ul class:collapse={!expanded}>
      {#if expanded}
        <JSONNode key="message" value={value.message} />
        <li>
          <JSONKey key="stack" colon=":" {isParentExpanded} />
          <span>
            {#each stack as line, index}
              <span class:indent={index > 0}>{line}</span><br />
            {/each}
          </span>
        </li>
      {/if}
    </ul>
  {/if}
</li>