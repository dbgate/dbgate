import { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveTreeNode } from 'dbgate-datalib';
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
