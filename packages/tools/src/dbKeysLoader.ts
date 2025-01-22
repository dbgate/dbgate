import _omit from 'lodash/omit';

const SHOW_INCREMENT = 100;

export interface DbKeysNodeModelBase {
  text?: string;
  count?: number;
  level: number;
}

export interface DbKeysLeafNodeModel extends DbKeysNodeModelBase {
  key: string;

  type: 'string' | 'hash' | 'set' | 'list' | 'zset' | 'stream' | 'binary' | 'ReJSON-RL';
}

export interface DbKeysFolderNodeModel extends DbKeysNodeModelBase {
  root: string;
  type: 'dir';
  maxShowCount?: number;
  isExpanded?: boolean;
  shouldLoadNext?: boolean;
  hasNext?: boolean;
}

export interface DbKeysTreeModel {
  root: DbKeysFolderNodeModel;
  dirsByKey: { [key: string]: DbKeysFolderNodeModel };
  childrenByKey: { [key: string]: DbKeysNodeModel[] };
  refreshAll?: boolean;
}

export type DbKeysNodeModel = DbKeysLeafNodeModel | DbKeysFolderNodeModel;

export type DbKeysLoadFunction = (root: string, limit: number) => Promise<DbKeysNodeModel[]>;

export type DbKeysChangeModelFunction = (func: (model: DbKeysTreeModel) => DbKeysTreeModel) => void;

// function dbKeys_findFolderNode(node: DbKeysNodeModel, root: string) {
//   if (node.type != 'dir') {
//     return null;
//   }
//   if (node.root === root) {
//     return node;
//   }
//   for (const child of node.children ?? []) {
//     const res = dbKeys_findFolderNode(child, root);
//     if (res) {
//       return res;
//     }
//   }
//   return null;
// }

// export async function dbKeys_loadKeysFromNode(
//   tree: DbKeysTreeModel,
//   callingRoot: string,
//   separator: string,
//   loader: DbKeysLoadFunction
// ): Promise<DbKeysTreeModel> {
//   const callingRootNode = tree.dirsByKey[callingRoot];
//   if (!callingRootNode) {
//     return tree;
//   }
//   const newItems = await loader(callingRoot, callingRootNode.maxShowCount ?? SHOW_INCREMENT);

//   return {
//     ...tree,
//     childrenByKey: {
//       ...tree.childrenByKey,
//       [callingRoot]: newItems,
//     },
//   };
// }

export async function dbKeys_loadMissing(tree: DbKeysTreeModel, loader: DbKeysLoadFunction): Promise<DbKeysTreeModel> {
  const childrenByKey = { ...tree.childrenByKey };
  const dirsByKey = { ...tree.dirsByKey };

  for (const root in tree.dirsByKey) {
    const dir = tree.dirsByKey[root];

    if (dir.isExpanded && dir.shouldLoadNext) {
      if (!tree.childrenByKey[root] || dir.hasNext) {
        const loadCount = dir.maxShowCount && dir.shouldLoadNext ? dir.maxShowCount + SHOW_INCREMENT : SHOW_INCREMENT;
        const items = await loader(root, loadCount + 1);

        childrenByKey[root] = items.slice(0, loadCount);
        dirsByKey[root] = {
          ...dir,
          shouldLoadNext: false,
          maxShowCount: loadCount,
          hasNext: items.length > loadCount,
        };

        for (const child of items.slice(0, loadCount)) {
          if (child.type == 'dir' && !dirsByKey[child.root]) {
            dirsByKey[child.root] = {
              shouldLoadNext: false,
              maxShowCount: null,
              hasNext: false,
              isExpanded: false,
              type: 'dir',
              level: dir.level + 1,
              root: child.root,
              text: child.text,
            };
          }
        }
      } else {
        dirsByKey[root] = {
          ...dir,
          shouldLoadNext: false,
        };
      }
    }
  }

  return {
    ...tree,
    dirsByKey,
    childrenByKey,
    refreshAll: false,
  };
}

export function dbKeys_markNodeExpanded(tree: DbKeysTreeModel, root: string, isExpanded: boolean): DbKeysTreeModel {
  const node = tree.dirsByKey[root];
  if (!node) {
    return tree;
  }
  return {
    ...tree,
    dirsByKey: {
      ...tree.dirsByKey,
      [root]: {
        ...node,
        isExpanded,
        shouldLoadNext: isExpanded,
      },
    },
  };
}

export function dbKeys_refreshAll(tree?: DbKeysTreeModel): DbKeysTreeModel {
  const root: DbKeysFolderNodeModel = {
    isExpanded: true,
    level: 0,
    root: '',
    type: 'dir',
    shouldLoadNext: true,
  };
  return {
    ...tree,
    childrenByKey: {},
    dirsByKey: {
      '': root,
    },
    refreshAll: true,
    root,
  };
}

export function dbKeys_reloadFolder(tree: DbKeysTreeModel, root: string): DbKeysTreeModel {
  return {
    ...tree,
    childrenByKey: _omit(tree.childrenByKey, root),
    dirsByKey: {
      ...tree.dirsByKey,
      [root]: {
        ...tree.dirsByKey[root],
        shouldLoadNext: true,
        hasNext: undefined,
      },
    },
  };
}

function addFlatItems(tree: DbKeysTreeModel, root: string, res: DbKeysNodeModel[]) {
  const item = tree.dirsByKey[root];
  if (!item.isExpanded) {
    return false;
  }
  const children = tree.childrenByKey[root] || [];
  for (const child of children) {
    res.push(child);
    if (child.type == 'dir') {
      addFlatItems(tree, child.root, res);
    }
  }
}

export function dbKeys_getFlatList(tree: DbKeysTreeModel) {
  const res: DbKeysNodeModel[] = [];
  addFlatItems(tree, '', res);
  return res;
}
