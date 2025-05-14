import _omit from 'lodash/omit';
import _sortBy from 'lodash/sortBy';

export const DB_KEYS_SHOW_INCREMENT = 100;

export interface DbKeysNodeModelBase {
  text?: string;
  sortKey: string;
  key: string;
  count?: number;
  level: number;
  keyPath: string[];
  parentKey: string;
}

export interface DbKeysLeafNodeModel extends DbKeysNodeModelBase {
  type: 'string' | 'hash' | 'set' | 'list' | 'zset' | 'stream' | 'binary' | 'ReJSON-RL';
}

export interface DbKeysFolderNodeModel extends DbKeysNodeModelBase {
  // root: string;
  type: 'dir';
  // visibleCount?: number;
  // isExpanded?: boolean;
}

export interface DbKeysFolderStateMode {
  key: string;
  visibleCount?: number;
  isExpanded?: boolean;
}

export interface DbKeysTreeModel {
  treeKeySeparator: string;
  root: DbKeysFolderNodeModel;
  dirsByKey: { [key: string]: DbKeysFolderNodeModel };
  dirStateByKey: { [key: string]: DbKeysFolderStateMode };
  childrenByKey: { [key: string]: DbKeysNodeModel[] };
  keyObjectsByKey: { [key: string]: DbKeysNodeModel };
  scannedKeys: number;
  loadCount: number;
  dbsize: number;
  cursor: string;
  loadedAll: boolean;
  // refreshAll?: boolean;
}

export type DbKeysNodeModel = DbKeysLeafNodeModel | DbKeysFolderNodeModel;

export interface DbKeyLoadedModel {
  key: string;

  type: 'string' | 'hash' | 'set' | 'list' | 'zset' | 'stream' | 'binary' | 'ReJSON-RL';
  count?: number;
}

export interface DbKeysLoadResult {
  nextCursor: string;
  keys: DbKeyLoadedModel[];
  dbsize: number;
}

// export type DbKeysLoadFunction = (root: string, limit: number) => Promise<DbKeysLoadResult>;

export type DbKeysChangeModelFunction = (
  func: (model: DbKeysTreeModel) => DbKeysTreeModel,
  loadNextPage: boolean
) => void;

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

// export async function dbKeys_loadMissing(tree: DbKeysTreeModel, loader: DbKeysLoadFunction): Promise<DbKeysTreeModel> {
//   const childrenByKey = { ...tree.childrenByKey };
//   const dirsByKey = { ...tree.dirsByKey };

//   for (const root in tree.dirsByKey) {
//     const dir = tree.dirsByKey[root];

//     if (dir.isExpanded && dir.shouldLoadNext) {
//       if (!tree.childrenByKey[root] || dir.hasNext) {
//         const loadCount = dir.maxShowCount && dir.shouldLoadNext ? dir.maxShowCount + SHOW_INCREMENT : SHOW_INCREMENT;
//         const items = await loader(root, loadCount + 1);

//         childrenByKey[root] = items.slice(0, loadCount);
//         dirsByKey[root] = {
//           ...dir,
//           shouldLoadNext: false,
//           maxShowCount: loadCount,
//           hasNext: items.length > loadCount,
//         };

//         for (const child of items.slice(0, loadCount)) {
//           if (child.type == 'dir' && !dirsByKey[child.root]) {
//             dirsByKey[child.root] = {
//               shouldLoadNext: false,
//               maxShowCount: null,
//               hasNext: false,
//               isExpanded: false,
//               type: 'dir',
//               level: dir.level + 1,
//               root: child.root,
//               text: child.text,
//             };
//           }
//         }
//       } else {
//         dirsByKey[root] = {
//           ...dir,
//           shouldLoadNext: false,
//         };
//       }
//     }
//   }

//   return {
//     ...tree,
//     dirsByKey,
//     childrenByKey,
//     refreshAll: false,
//   };
// }

export function dbKeys_mergeNextPage(tree: DbKeysTreeModel, nextPage: DbKeysLoadResult): DbKeysTreeModel {
  const keyObjectsByKey = { ...tree.keyObjectsByKey };

  for (const keyObj of nextPage.keys) {
    const keyPath = keyObj.key.split(tree.treeKeySeparator);
    keyObjectsByKey[keyObj.key] = {
      ...keyObj,
      level: keyPath.length,
      text: keyPath[keyPath.length - 1],
      sortKey: keyPath[keyPath.length - 1],
      keyPath,
      parentKey: keyPath.slice(0, -1).join(tree.treeKeySeparator),
    };
  }

  const dirsByKey: { [key: string]: DbKeysFolderNodeModel } = {};
  const childrenByKey: { [key: string]: DbKeysNodeModel[] } = {};

  dirsByKey[''] = tree.root;

  for (const keyObj of Object.values(keyObjectsByKey)) {
    const dirPath = keyObj.keyPath.slice(0, -1);
    const dirKey = dirPath.join(tree.treeKeySeparator);

    let dirDepth = keyObj.keyPath.length - 1;

    while (dirDepth > 0) {
      const newDirPath = keyObj.keyPath.slice(0, dirDepth);
      const newDirKey = newDirPath.join(tree.treeKeySeparator);
      if (!dirsByKey[newDirKey]) {
        dirsByKey[newDirKey] = {
          level: keyObj.level - 1,
          keyPath: newDirPath,
          parentKey: newDirPath.slice(0, -1).join(tree.treeKeySeparator),
          type: 'dir',
          key: newDirKey,
          text: `${newDirPath[newDirPath.length - 1]}${tree.treeKeySeparator}*`,
          sortKey: newDirPath[newDirPath.length - 1],
        };
      }

      dirDepth -= 1;
    }

    if (!childrenByKey[dirKey]) {
      childrenByKey[dirKey] = [];
    }

    childrenByKey[dirKey].push(keyObj);
  }

  for (const dirObj of Object.values(dirsByKey)) {
    if (dirObj.key == '') {
      continue;
    }

    if (!childrenByKey[dirObj.parentKey]) {
      childrenByKey[dirObj.parentKey] = [];
    }
    childrenByKey[dirObj.parentKey].push(dirObj);

    // set key count
    dirsByKey[dirObj.key].count = childrenByKey[dirObj.key].length;
  }

  for (const key in childrenByKey) {
    childrenByKey[key] = _sortBy(childrenByKey[key], 'sortKey');
  }

  return {
    ...tree,
    cursor: nextPage.nextCursor,
    dirsByKey,
    childrenByKey,
    keyObjectsByKey,
    scannedKeys: tree.scannedKeys + tree.loadCount,
    loadedAll: nextPage.nextCursor == '0',
    dbsize: nextPage.dbsize,
  };
}

export function dbKeys_markNodeExpanded(tree: DbKeysTreeModel, root: string, isExpanded: boolean): DbKeysTreeModel {
  const node = tree.dirStateByKey[root];
  return {
    ...tree,
    dirStateByKey: {
      ...tree.dirStateByKey,
      [root]: {
        ...node,
        isExpanded,
      },
    },
  };
}

export function dbKeys_showNextItems(tree: DbKeysTreeModel, root: string): DbKeysTreeModel {
  const node = tree.dirStateByKey[root];
  return {
    ...tree,
    dirStateByKey: {
      ...tree.dirStateByKey,
      [root]: {
        ...node,
        visibleCount: (node?.visibleCount ?? DB_KEYS_SHOW_INCREMENT) + DB_KEYS_SHOW_INCREMENT,
      },
    },
  };
}

export function dbKeys_createNewModel(treeKeySeparator: string): DbKeysTreeModel {
  const root: DbKeysFolderNodeModel = {
    level: 0,
    type: 'dir',
    keyPath: [],
    parentKey: '',
    key: '',
    sortKey: '',
  };
  return {
    treeKeySeparator,
    childrenByKey: {},
    keyObjectsByKey: {},
    dirsByKey: {
      '': root,
    },
    dirStateByKey: {
      '': {
        key: '',
        visibleCount: DB_KEYS_SHOW_INCREMENT,
        isExpanded: true,
      },
    },
    scannedKeys: 0,
    dbsize: 0,
    loadCount: 2000,
    cursor: '0',
    root,
    loadedAll: false,
  };
}

export function dbKeys_clearLoadedData(tree: DbKeysTreeModel): DbKeysTreeModel {
  return {
    ...tree,
    childrenByKey: {},
    keyObjectsByKey: {},
    dirsByKey: {
      '': tree.root,
    },
    scannedKeys: 0,
    dbsize: 0,
    cursor: '0',
    loadedAll: false,
  };
}

// export function dbKeys_reloadFolder(tree: DbKeysTreeModel, root: string): DbKeysTreeModel {
//   return {
//     ...tree,
//     childrenByKey: _omit(tree.childrenByKey, root),
//     dirsByKey: {
//       ...tree.dirsByKey,
//       [root]: {
//         ...tree.dirsByKey[root],
//         shouldLoadNext: true,
//         hasNext: undefined,
//       },
//     },
//   };
// }

function addFlatItems(tree: DbKeysTreeModel, root: string, res: DbKeysNodeModel[], visitedRoots: string[] = []) {
  const item = tree.dirStateByKey[root];
  if (!item?.isExpanded) {
    return false;
  }
  const children = tree.childrenByKey[root] || [];
  for (const child of children) {
    res.push(child);
    if (child.type == 'dir') {
      if (visitedRoots.includes(child.key)) {
        console.warn('Redis: preventing infinite loop for root', child.key);
        return false;
      }
      addFlatItems(tree, child.key, res, [...visitedRoots, root]);
    }
  }
}

export function dbKeys_getFlatList(tree: DbKeysTreeModel) {
  const res: DbKeysNodeModel[] = [];
  addFlatItems(tree, '', res);
  return res;
}
