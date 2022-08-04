<script lang="ts">
  import { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveTreeNode } from 'dbgate-datalib';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';
  import { showModal } from '../modals/modalTools';
  import contextMenu from '../utility/contextMenu';
  import CustomJoinModal from './CustomJoinModal.svelte';

  export let conid;
  export let database;
  export let node: PerspectiveTreeNode;
  export let root: PerspectiveTreeNode;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;

  function createMenu() {
    const customJoin = node.customJoinConfig;
    const filterInfo = node.filterInfo;
    return [
      filterInfo && {
        text: 'Add to filter',
        onClick: () =>
          setConfig(cfg => ({
            ...cfg,
            filterInfos: {
              ...cfg.filterInfos,
              [node.uniqueName]: filterInfo,
            },
          })),
      },
      customJoin && {
        text: 'Remove custom join',
        onClick: () =>
          setConfig(cfg => ({
            ...cfg,
            customJoins: (cfg.customJoins || []).filter(x => x.joinid != customJoin.joinid),
          })),
      },
      customJoin && {
        text: 'Edit custom join',
        onClick: () =>
          showModal(CustomJoinModal, {
            config,
            setConfig,
            conid,
            database,
            root,
            editValue: customJoin,
          }),
      },
    ];
  }
</script>

<div class="row" use:contextMenu={createMenu}>
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
