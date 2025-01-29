<script lang="ts">
  import type { ChangePerspectiveConfigFunc, PerspectiveConfig } from 'dbgate-datalib';
  import { PerspectiveTreeNode } from 'dbgate-datalib';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';
  import { showModal } from '../modals/modalTools';
  import contextMenu from '../utility/contextMenu';
  import CustomJoinModal from './CustomJoinModal.svelte';
  import { getPerspectiveNodeMenu } from './perspectiveMenu';
  import SortOrderIcon from '../designer/SortOrderIcon.svelte';

  export let conid;
  export let database;
  export let node: PerspectiveTreeNode;
  export let root: PerspectiveTreeNode;
  export let tempRoot: PerspectiveTreeNode;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;

  function createMenu() {
    return getPerspectiveNodeMenu({
      conid,
      database,
      node,
      root,
      config,
      setConfig,
      designerId: node?.designerId,
    });
  }
</script>

<div class="row" use:contextMenu={createMenu}>
  <span class="expandColumnIcon" style={`margin-right: ${5 + (node.level - (tempRoot?.level ?? 0)) * 10}px`}>
    <FontIcon
      icon={node.isExpandable ? plusExpandIcon(node.isExpanded) : 'icon invisible-box'}
      data-testid={`PerspectiveNodeRow_expand_${node.pathIdentifier}`}
      on:click={() => {
        node.toggleExpanded();
      }}

    />
  </span>

  <input
    type="checkbox"
    checked={node.isChecked}
    on:click={e => {
      e.stopPropagation();
    }}
    on:mousedown={e => {
      e.stopPropagation();
    }}
    on:change={() => {
      node.toggleChecked();
    }}
    data-testid={`PerspectiveNodeRow_check_${node.pathIdentifier}`}
  />

  {#if node.secondaryCheckable}
    <input
      type="checkbox"
      checked={node.isSecondaryChecked}
      on:click={e => {
        e.stopPropagation();
      }}
      on:mousedown={e => {
        e.stopPropagation();
      }}
      on:change={() => {
        node.toggleSecondaryChecked();
      }}
    />
  {/if}

  <FontIcon icon={node.icon} />

  <span>{node.title}</span>

  <SortOrderIcon order={node.sortOrder} orderIndex={node.sortOrderIndex} />

  {#if node.getFilter()}
    <FontIcon icon="img filter" />
  {/if}
</div>

<style>
  .row {
    margin-left: 5px;
    margin-right: 5px;
    cursor: pointer;
    white-space: nowrap;
  }
  .row:hover {
    background: var(--theme-bg-hover);
  }

  /* .row.isSelected {
    background: var(--theme-bg-selected);
  } */
</style>
