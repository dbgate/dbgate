<script>
  import { getContext, setContext } from 'svelte';
  import JSONArrow from './JSONArrow.svelte';
  import JSONNode from './JSONNode.svelte';
  import JSONKey from './JSONKey.svelte';

  export let key,
    keys,
    colon = ':',
    label = '',
    isParentExpanded,
    isParentArray,
    isArray = false,
    bracketOpen,
    bracketClose;
  export let previewKeys = keys;
  export let getKey = key => key;
  export let getValue = key => key;
  export let getPreviewValue = getValue;
  export let expanded = false,
    expandable = true;
  export let elementValue = null;
  export let onRootExpandedChanged = null;
  export let labelOverride = null;
  export let hideKey = false;

  const context = getContext('json-tree-context-key');
  setContext('json-tree-context-key', { ...context, colon });
  const elementData = getContext('json-tree-element-data');
  const slicedKeyCount = getContext('json-tree-sliced-key-count');
  const keyLabel = labelOverride ?? key;
  const PAGE_SIZE = 100;
  let visibleKeyCount = PAGE_SIZE;

  //   $: slicedKeys = expanded ? keys : previewKeys.slice(0, Math.max(slicedKeyCount || 5, visibleKeyCount));
  $: slicedKeys = expanded ? keys?.slice(0, visibleKeyCount) : previewKeys.slice(0, slicedKeyCount || 5);

  $: if (!isParentExpanded) {
    expanded = false;
  }

  function toggleExpand() {
    expanded = !expanded;
    if (onRootExpandedChanged) {
      onRootExpandedChanged(expanded);
    }
  }

  function expand() {
    expanded = true;
  }

  let domElement;

  $: if (domElement && elementData && elementValue) {
    elementData.set(domElement, elementValue);
  }

  function showNextKeys() {
    visibleKeyCount += PAGE_SIZE;
  }

  $: visibleShowNextKeys = expanded && slicedKeys.length < keys.length;
</script>

<li class:indent={isParentExpanded} class:jsonValueHolder={!!elementValue} bind:this={domElement}>
  <label>
    {#if expandable && isParentExpanded}
      <JSONArrow on:click={toggleExpand} {expanded} />
    {/if}
    {#if !hideKey}
      <JSONKey
        key={keyLabel}
        colon={context.colon}
        {isParentExpanded}
        {isParentArray}
        {hideKey}
        on:click={toggleExpand}
      />
    {/if}
    <span on:click={toggleExpand}><span>{label}</span>{bracketOpen}</span>
  </label>
  {#if isParentExpanded}
    <ul class:collapse={!expanded} on:click={expand}>
      {#each slicedKeys as key, index}
        <JSONNode
          key={getKey(key)}
          isParentExpanded={expanded}
          isParentArray={isArray}
          value={expanded ? getValue(key) : getPreviewValue(key)}
        />
        {#if !expanded && index < previewKeys.length - 1}
          <span class="comma">,</span>
        {/if}
      {/each}
      {#if !visibleShowNextKeys && slicedKeys.length < previewKeys.length}
        <span>…</span>
      {/if}
    </ul>
  {:else}
    <span>…</span>
  {/if}

  {#if visibleShowNextKeys}
    <span class="load-more">
      <!-- svelte-ignore a11y-invalid-attribute -->
      <a href="#" on:click|preventDefault={showNextKeys}>(Next 100)</a>
    </span>
  {/if}

  <span>{bracketClose}</span>
</li>

<style>
  label {
    display: inline-block;
  }
  .indent {
    padding-left: var(--li-identation);
  }
  .collapse {
    --li-display: inline;
    display: inline;
    font-style: italic;
  }
  .comma {
    margin-left: -0.5em;
    margin-right: 0.5em;
  }

  label {
    /* display: contents; */
    position: relative;
  }

  .load-more {
    margin-left: 2em;
    font-style: italic;
    color: var(--theme-font-link);
  }
  .load-more a {
    color: var(--theme-font-link);
    text-decoration: none;
    cursor: pointer;
  }
  .load-more a:hover {
    text-decoration: underline;
  }
</style>
