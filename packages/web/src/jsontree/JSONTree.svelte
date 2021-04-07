<script lang="ts">
  import JSONNode from './JSONNode.svelte';
  import { setContext } from 'svelte';
  import contextMenu, { getContextMenu } from '../utility/contextMenu';

  setContext('json-tree-context-key', {});

  export let key = '';
  export let menu = null;
  export let value;
  export let expanded = false;
  export let labelOverride = null;

  export let isDeleted;
  export let isInserted;
  export let isModified;

  const parentMenu = getContextMenu();
</script>

<ul use:contextMenu={[parentMenu, menu]} class:isDeleted class:isInserted class:isModified>
  <JSONNode {key} {value} isParentExpanded={true} isParentArray={false} {expanded} {labelOverride} />
</ul>

<style>
  ul {
    --string-color: var(--json-tree-string-color, #cb3f41);
    --symbol-color: var(--json-tree-symbol-color, #cb3f41);
    --boolean-color: var(--json-tree-boolean-color, #112aa7);
    --function-color: var(--json-tree-function-color, #112aa7);
    --number-color: var(--json-tree-number-color, #3029cf);
    --label-color: var(--json-tree-label-color, #871d8f);
    --arrow-color: var(--json-tree-arrow-color, #727272);
    --null-color: var(--json-tree-null-color, #8d8d8d);
    --undefined-color: var(--json-tree-undefined-color, #8d8d8d);
    --date-color: var(--json-tree-date-color, #8d8d8d);
    --li-identation: var(--json-tree-li-indentation, 1em);
    --li-line-height: var(--json-tree-li-line-height, 1.3);
    --li-colon-space: 0.3em;
    font-size: var(--json-tree-font-size, 12px);
    font-family: var(--json-tree-font-family, 'Courier New', Courier, monospace);
  }
  ul :global(li) {
    line-height: var(--li-line-height);
    display: var(--li-display, list-item);
    list-style: none;
    white-space: nowrap;
  }
  ul,
  ul :global(ul) {
    padding: 0;
    margin: 0;
  }
  ul.isDeleted {
    background: var(--theme-bg-volcano);
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAEElEQVQImWNgIAX8x4KJBAD+agT8INXz9wAAAABJRU5ErkJggg==');
    background-repeat: repeat-x;
    background-position: 50% 50%;
  }
  ul.isModified {
    background: var(--theme-bg-gold);
  }
  ul.isInserted {
    background: var(--theme-bg-green);
  }
</style>
