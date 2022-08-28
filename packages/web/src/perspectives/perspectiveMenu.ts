import { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveTreeNode } from 'dbgate-datalib';
import _ from 'lodash';
import { showModal } from '../modals/modalTools';
import CustomJoinModal from './CustomJoinModal.svelte';

interface PerspectiveNodeMenuProps {
  node: PerspectiveTreeNode;
  conid: string;
  database: string;
  root: PerspectiveTreeNode;
  config: PerspectiveConfig;
  setConfig: ChangePerspectiveConfigFunc;
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

export function getPerspectiveNodeMenu(props: PerspectiveNodeMenuProps) {
  const { node, conid, database, root, config, setConfig } = props;
  const customJoin = node.customJoinConfig;
  const filterInfo = node.filterInfo;

  const parentDesignerId = node?.parentNode?.designerId || '';
  const columnName = node.columnName;
  const sort = config.nodes?.find(x => x.designerId == parentDesignerId)?.sort;
  const order = sort?.find(x => x.columnName == columnName)?.order;
  const orderIndex = sort?.length > 1 ? _.findIndex(sort, x => x.columnName == columnName) : -1;
  const isSortDefined = sort?.length > 0;

  const setSort = order => {
    setConfig(cfg => setPerspectiveSort(cfg, parentDesignerId, columnName, order), true);
  };

  const addToSort = order => {
    setConfig(cfg => addToPerspectiveSort(cfg, parentDesignerId, columnName, order), true);

    // setConfig(
    //   cfg => ({
    //     ...cfg,
    //     sort: {
    //       ...cfg.sort,
    //       [parentUniqueName]: [...(cfg.sort?.[parentUniqueName] || []), { uniqueName, order }],
    //     },
    //   }),
    //   true
    // );
  };

  const clearSort = () => {
    setConfig(cfg => clearPerspectiveSort(cfg, parentDesignerId), true);

    // setConfig(
    //   cfg => ({
    //     ...cfg,
    //     sort: {
    //       ...cfg.sort,
    //       [parentUniqueName]: [],
    //     },
    //   }),
    //   true
    // );
  };

  return [
    { onClick: () => setSort('ASC'), text: 'Sort ascending' },
    { onClick: () => setSort('DESC'), text: 'Sort descending' },
    isSortDefined && !order && { onClick: () => addToSort('ASC'), text: 'Add to sort - ascending' },
    isSortDefined && !order && { onClick: () => addToSort('DESC'), text: 'Add to sort - descending' },
    order && { onClick: () => clearSort(), text: 'Clear sort criteria' },
    { divider: true },

    filterInfo && {
      text: 'Add to filter',
      onClick: () => setConfig(cfg => addToPerspectiveFilter(cfg, parentDesignerId, columnName)),

      // setConfig(cfg => ({
      //   ...cfg,

      //   filters: {
      //     ...cfg.filters,
      //     [node.uniqueName]: '',
      //   },
      // })),
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
  ];
}
