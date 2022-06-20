<script lang="ts">
  import { PerspectiveTreeNode } from 'dbgate-datalib';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';

  export let node: PerspectiveTreeNode;
</script>

<div class="row">
  <span class="expandColumnIcon" style={`margin-right: ${5 + node.level * 10}px`}>
    <FontIcon
      icon={node.isExpandable ? plusExpandIcon(node.isExpanded) : 'icon invisible-box'}
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
  />

  <FontIcon icon={node.icon} />

  <span>{node.title}</span>
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

  .row.isSelected {
    background: var(--theme-bg-selected);
  }
</style>
