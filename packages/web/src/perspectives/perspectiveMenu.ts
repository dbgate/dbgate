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

export function getPerspectiveNodeMenu(props: PerspectiveNodeMenuProps) {
  const { node, conid, database, root, config, setConfig } = props;
  const customJoin = node.customJoinConfig;
  const filterInfo = node.filterInfo;

  const parentUniqueName = node?.parentNode?.uniqueName || '';
  const uniqueName = node.uniqueName;
  const order = config.sort?.[parentUniqueName]?.find(x => x.uniqueName == uniqueName)?.order;
  const orderIndex =
    config.sort?.[parentUniqueName]?.length > 1
      ? _.findIndex(config.sort?.[parentUniqueName], x => x.uniqueName == uniqueName)
      : -1;
  const isSortDefined = config.sort?.[parentUniqueName]?.length > 0;

  const setSort = order => {
    setConfig(
      cfg => ({
        ...cfg,
        sort: {
          ...cfg.sort,
          [parentUniqueName]: [{ uniqueName, order }],
        },
      }),
      true
    );
  };

  const addToSort = order => {
    setConfig(
      cfg => ({
        ...cfg,
        sort: {
          ...cfg.sort,
          [parentUniqueName]: [...(cfg.sort?.[parentUniqueName] || []), { uniqueName, order }],
        },
      }),
      true
    );
  };

  const clearSort = () => {
    setConfig(
      cfg => ({
        ...cfg,
        sort: {
          ...cfg.sort,
          [parentUniqueName]: [],
        },
      }),
      true
    );
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
