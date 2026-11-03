<script lang="ts" context="module">
  export const FOLDER_DRAG_DATA_TYPE = 'connection_folder_drag_data';
</script>

<script lang="ts">
  import _ from 'lodash';
  import { chevronExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';
  import contextMenu from '../utility/contextMenu';
  import AppObjectListItem from './AppObjectListItem.svelte';

  // FolderTreeNode - { path, name, children }
  export let node;
  // folder path => [{ data, isMatched, isChildMatched, isMainMatched }]
  export let itemsByFolder;
  // folder path => { matched, total } for the whole subtree
  export let countsByFolder;
  export let level = 0;
  export let module;
  export let filter = undefined;
  export let passProps = {};
  export let subItemsComponent = undefined;
  export let expandOnClick = false;
  export let isExpandable = undefined;
  export let expandIconFunc = undefined;
  export let getIsExpanded = null;
  export let setIsExpanded = null;
  export let collapsedGroupNames;
  export let groupContextMenu = null;
  export let folderDragEnabled = false;
  // (connectionDragData, folderPath)
  export let onDropConnection = undefined;
  // (sourceFolderPath, targetFolderPath, position: 'into' | 'before' | 'after')
  export let onDropFolder = undefined;

  let domHeader;
  let dropPosition = null;

  $: isExpanded = !$collapsedGroupNames.includes(node.path);
  $: items = itemsByFolder.get(node.path) || [];
  $: counts = countsByFolder.get(node.path) || { matched: 0, total: 0 };
  $: countText = counts.matched < counts.total ? `${counts.matched}/${counts.total}` : `${counts.total}`;

  function hasDragType(e, type) {
    return Array.prototype.includes.call(e.dataTransfer?.types || [], type);
  }

  function getDropPosition(e) {
    if (hasDragType(e, FOLDER_DRAG_DATA_TYPE)) {
      const rect = domHeader.getBoundingClientRect();
      const ratio = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
      if (ratio < 0.25) return 'before';
      if (ratio > 0.75) return 'after';
      return 'into';
    }
    if (hasDragType(e, 'app_object_drag_data')) {
      return 'into';
    }
    return null;
  }

  function handleHeaderDragOver(e) {
    dropPosition = getDropPosition(e);
  }

  function handleHeaderDragLeave(e) {
    if (e.relatedTarget && domHeader?.contains(e.relatedTarget)) return;
    dropPosition = null;
  }

  function handleDrop(e, position) {
    dropPosition = null;
    const folderData = e.dataTransfer.getData(FOLDER_DRAG_DATA_TYPE);
    if (folderData && onDropFolder) {
      e.stopPropagation();
      onDropFolder(folderData, node.path, position);
      return;
    }
    const data = e.dataTransfer.getData('app_object_drag_data');
    if (data && onDropConnection) {
      e.stopPropagation();
      onDropConnection(data, node.path);
    }
  }
</script>

<div
  class="group"
  class:dropBefore={dropPosition == 'before'}
  class:dropAfter={dropPosition == 'after'}
  class:dropInto={dropPosition == 'into'}
  style:padding-left={`${5 + level * 12}px`}
  bind:this={domHeader}
  draggable={folderDragEnabled}
  on:dragstart={e => {
    e.dataTransfer.setData(FOLDER_DRAG_DATA_TYPE, node.path);
  }}
  on:dragover={handleHeaderDragOver}
  on:dragleave={handleHeaderDragLeave}
  on:dragend={() => {
    dropPosition = null;
  }}
  on:drop={e => handleDrop(e, getDropPosition(e) || 'into')}
  on:click={() =>
    collapsedGroupNames.update(names => {
      if (names.includes(node.path)) return names.filter(x => x != node.path);
      return [...names, node.path];
    })}
  use:contextMenu={groupContextMenu ? () => groupContextMenu(node.path) : null}
  data-testid={`ConnectionFolderGroup_header_${node.path}`}
>
  <span class="expand-icon">
    <FontIcon icon={chevronExpandIcon(isExpanded)} />
  </span>

  {node.name}
  ({countText})
</div>

{#if isExpanded}
  <div
    on:drop={e => handleDrop(e, 'into')}
    data-testid={`app-object-group-items-${_.kebabCase(node.path)}`}
  >
    {#each node.children as child (child.path)}
      <svelte:self
        node={child}
        level={level + 1}
        {itemsByFolder}
        {countsByFolder}
        {module}
        {filter}
        {passProps}
        {subItemsComponent}
        {expandOnClick}
        {isExpandable}
        {expandIconFunc}
        {getIsExpanded}
        {setIsExpanded}
        {collapsedGroupNames}
        {groupContextMenu}
        {folderDragEnabled}
        {onDropConnection}
        {onDropFolder}
      />
    {/each}
    <div style:padding-left={`${level * 12}px`}>
      {#each items as item}
        <AppObjectListItem
          isHidden={!item.isMatched}
          {module}
          {subItemsComponent}
          {expandOnClick}
          {isExpandable}
          {expandIconFunc}
          {getIsExpanded}
          {setIsExpanded}
          data={item.data}
          {passProps}
          isExpandedBySearch={filter && item.isChildMatched}
          {filter}
          isMainMatched={item.isMainMatched}
        />
      {/each}
    </div>
  </div>
{/if}

<style>
  .group {
    user-select: none;
    padding: 5px;
    cursor: pointer;
    white-space: nowrap;
    font-weight: bold;
    border-top: 2px solid transparent;
    border-bottom: 2px solid transparent;
  }

  .group:hover {
    background-color: var(--theme-sidebar-background-hover);
  }

  .group.dropBefore {
    border-top-color: var(--theme-link-foreground);
  }

  .group.dropAfter {
    border-bottom-color: var(--theme-link-foreground);
  }

  .group.dropInto {
    background-color: var(--theme-sidebar-background-hover);
    outline: 1px dashed var(--theme-link-foreground);
  }

  .expand-icon {
    margin-right: 3px;
  }
</style>
