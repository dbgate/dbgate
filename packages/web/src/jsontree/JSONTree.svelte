<script lang="ts">
  import JSONNode from './JSONNode.svelte';
  import { setContext } from 'svelte';
  import contextMenu, { getContextMenu } from '../utility/contextMenu';
  import _ from 'lodash';
  import { copyTextToClipboard } from '../utility/clipboard';
  import { openJsonLinesData } from '../utility/openJsonLinesData';
  import { useSettings } from '../utility/metadataLoaders';

  setContext('json-tree-context-key', {});

  export let key = '';
  export let menu = null;
  export let value;
  export let expandAll = false;
  export let expanded = expandAll;
  export let labelOverride = null;
  export let slicedKeyCount = null;
  export let disableContextMenu = null;
  export let onRootExpandedChanged = null;

  export let isDeleted = false;
  export let isInserted = false;
  export let isModified = false;
  export let hideKey = false;

  const settings = useSettings();
  $: wrap = $settings?.['behaviour.jsonPreviewWrap'];

  setContext('json-tree-default-expanded', expandAll);
  if (slicedKeyCount) setContext('json-tree-sliced-key-count', slicedKeyCount);

  const elementData = new WeakMap();

  if (elementData) {
    setContext('json-tree-element-data', elementData);
  }

  const parentMenu = getContextMenu();

  function getElementMenu({ targetElement }) {
    if (!targetElement) return null;
    const closest = targetElement.closest('.jsonValueHolder');
    if (!closest) return;
    const value = elementData.get(closest);

    const res = [];

    res.push({
      text: 'Copy JSON',
      onClick: () => {
        copyTextToClipboard(JSON.stringify(value, null, 2));
      },
    });

    if (value && _.isArray(value)) {
      res.push({
        text: 'Open as table',
        onClick: () => {
          openJsonLinesData(value);
        },
      });
    }
    return res;
  }
</script>

<ul
  use:contextMenu={disableContextMenu ? '__no_menu' : [parentMenu, menu, getElementMenu]}
  class:isDeleted
  class:isInserted
  class:isModified
  class:wrap
>
  <JSONNode
    {hideKey}
    {key}
    {value}
    isParentExpanded={true}
    isParentArray={false}
    {expanded}
    {labelOverride}
    {onRootExpandedChanged}
  />
</ul>

<style>
  ul {
    --string-color: var(--theme-json-tree-string-color);
    --symbol-color: var(--theme-json-tree-symbol-color);
    --boolean-color: var(--theme-json-tree-boolean-color);
    --function-color: var(--theme-json-tree-function-color);
    --number-color: var(--theme-json-tree-number-color);
    --label-color: var(--theme-json-tree-label-color);
    --arrow-color: var(--theme-json-tree-arrow-color);
    --null-color: var(--theme-json-tree-null-color);
    --undefined-color: var(--theme-json-tree-undefined-color);
    --date-color: var(--theme-json-tree-date-color);
    --li-identation: var(--json-tree-li-indentation, 1em);
    --li-line-height: var(--json-tree-li-line-height, 1.3);
    --li-colon-space: 0.3em;
    font-size: var(--json-tree-font-size, 12px);
    /* font-family: var(--json-tree-font-family, 'Courier New', Courier, monospace); */
    font-family: var(--json-tree-font-family, monospace);
  }
  ul :global(li) {
    line-height: var(--li-line-height);
    display: var(--li-display, list-item);
    list-style: none;
    white-space: nowrap;
  }
  ul.wrap :global(li) {
    white-space: normal;
  }
  ul,
  ul :global(ul) {
    padding: 0;
    margin: 0;
  }
  ul.isDeleted {
    background: var(--theme-json-tree-deleted-background);
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAEElEQVQImWNgIAX8x4KJBAD+agT8INXz9wAAAABJRU5ErkJggg==');
    background-repeat: repeat-x;
    background-position: 50% 50%;
  }
  ul.isModified {
    background: var(--theme-json-tree-modified-background);
  }
  ul.isInserted {
    background: var(--theme-json-tree-inserted-background);
  }
</style>
