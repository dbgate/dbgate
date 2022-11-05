import type { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveTreeNode } from 'dbgate-datalib';
import _ from 'lodash';
import { showModal } from '../modals/modalTools';
import CustomJoinModal from './CustomJoinModal.svelte';
import InputTextModal from '../modals/InputTextModal.svelte';
import runCommand from '../commands/runCommand';
import { tick } from 'svelte';

interface PerspectiveNodeMenuProps {
  node: PerspectiveTreeNode;
  conid: string;
  database: string;
  root: PerspectiveTreeNode;
  config: PerspectiveConfig;
  setConfig: ChangePerspectiveConfigFunc;
  designerId: string;
}

export function setPerspectiveSort(
  cfg: PerspectiveConfig,
  designerId: string,
  columnName: string,
  order: 'ASC' | 'DESC'
): PerspectiveConfig {
  return {
    ...cfg,
    nodes: cfg.nodes.map(n =>
      n.designerId == designerId
        ? {
            ...n,
            sort: [{ columnName, order }],
          }
        : n
    ),
  };
}

export function addToPerspectiveSort(
  cfg: PerspectiveConfig,
  designerId: string,
  columnName: string,
  order: 'ASC' | 'DESC'
): PerspectiveConfig {
  return {
    ...cfg,
    nodes: cfg.nodes.map(n =>
      n.designerId == designerId
        ? {
            ...n,
            sort: [...(n.sort || []).filter(x => x.columnName != columnName), { columnName, order }],
          }
        : n
    ),
  };
}

export function clearPerspectiveSort(cfg: PerspectiveConfig, designerId: string) {
  return {
    ...cfg,
    nodes: cfg.nodes.map(n =>
      n.designerId == designerId
        ? {
            ...n,
            sort: [],
          }
        : n
    ),
  };
}

export function addToPerspectiveFilter(
  cfg: PerspectiveConfig,
  designerId: string,
  columnName: string,
  filterValue: string = ''
) {
  return {
    ...cfg,
    nodes: cfg.nodes.map(n =>
      n.designerId == designerId
        ? {
            ...n,
            filters: {
              ...n.filters,
              [columnName]: filterValue,
            },
          }
        : n
    ),
  };
}

export function setPerspectiveTableAlias(cfg: PerspectiveConfig, designerId: string, alias: string) {
  return {
    ...cfg,
    nodes: cfg.nodes.map(n =>
      n.designerId == designerId
        ? {
            ...n,
            alias,
          }
        : n
    ),
  };
}

export function getPerspectiveNodeMenu(props: PerspectiveNodeMenuProps) {
  const { node, conid, database, root, config, setConfig, designerId } = props;

  const customJoin = node?.customJoinConfig;
  const filterInfo = node?.filterInfo;

  const parentDesignerId = node?.parentNode?.designerId || '';
  const columnName = node?.columnName;
  const sort = config.nodes?.find(x => x.designerId == parentDesignerId)?.sort;
  const order = sort?.find(x => x.columnName == columnName)?.order;
  const orderIndex = sort?.length > 1 ? _.findIndex(sort, x => x.columnName == columnName) : -1;
  const isSortDefined = sort?.length > 0;

  const nodeConfig = config.nodes.find(x => x.designerId == designerId);

  const setSort = order => {
    setConfig(cfg => setPerspectiveSort(cfg, parentDesignerId, columnName, order), true);
  };

  const addToSort = order => {
    setConfig(cfg => addToPerspectiveSort(cfg, parentDesignerId, columnName, order), true);
  };

  const clearSort = () => {
    setConfig(cfg => clearPerspectiveSort(cfg, parentDesignerId), true);
  };

  return [
    node?.isSortable && { onClick: () => setSort('ASC'), text: 'Sort ascending' },
    node?.isSortable && { onClick: () => setSort('DESC'), text: 'Sort descending' },
    node?.isSortable && isSortDefined && !order && { onClick: () => addToSort('ASC'), text: 'Add to sort - ascending' },
    node?.isSortable &&
      isSortDefined &&
      !order && { onClick: () => addToSort('DESC'), text: 'Add to sort - descending' },
    node?.isSortable && order && { onClick: () => clearSort(), text: 'Clear sort criteria' },
    { divider: true },

    filterInfo && {
      text: 'Add to filter',
      onClick: () => setConfig(cfg => addToPerspectiveFilter(cfg, parentDesignerId, columnName)),
    },
    customJoin && {
      text: 'Remove custom join',
      onClick: () =>
        setConfig(cfg => ({
          ...cfg,
          nodes: (cfg.nodes || []).filter(x => x.designerId != customJoin.refNodeDesignerId),
          references: (cfg.references || []).filter(x => x.designerId != customJoin.referenceDesignerId),
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
    node?.supportsParentFilter && {
      text: node.isParentFilter ? 'Cancel filter parent rows' : 'Filter parent rows',
      onClick: () => {
        setConfig(
          cfg => ({
            ...cfg,
            nodes: cfg.nodes.map(n =>
              n.designerId == node?.designerId ? { ...n, isParentFilter: !node.isParentFilter } : n
            ),
          }),
          true
        );
      },
    },

    nodeConfig && [
      {
        text: 'Set alias',
        onClick: () => {
          showModal(InputTextModal, {
            value: node?.nodeConfig?.alias || '',
            label: 'New alias',
            header: 'Set  alias',
            onConfirm: newAlias => {
              setConfig(cfg => setPerspectiveTableAlias(cfg, designerId, newAlias));
            },
          });
        },
      },
      nodeConfig?.alias && {
        text: 'Remove alias',
        onClick: () => setConfig(cfg => setPerspectiveTableAlias(cfg, designerId, null)),
      },
    ],

    nodeConfig &&
      config.rootDesignerId != designerId && [
        { divider: true },
        {
          text: 'Set root',
          onClick: async () => {
            setConfig(cfg => ({
              ...cfg,
              rootDesignerId: designerId,
            }));
            await tick();
            if (config.isArranged) {
              runCommand('designer.arrange');
            }
          },
        },
      ],
  ];
}
