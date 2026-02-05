import _omit from 'lodash/omit';
import _sortBy from 'lodash/sortBy';

export const DB_KEYS_SHOW_INCREMENT = 100;

export interface RedisNodeModelBase {
  text?: string;
  sortKey: string;
  key: string;
  count?: number;
  level: number;
  keyPath: string[];
  parentKey: string;
}

export interface RedisLeafNodeModel extends RedisNodeModelBase {
  type: 'string' | 'hash' | 'set' | 'list' | 'zset' | 'stream' | 'binary' | 'ReJSON-RL';
}

export interface RedisFolderNodeModel extends RedisNodeModelBase {
  // root: string;
  type: 'dir';
  // visibleCount?: number;
  // isExpanded?: boolean;
}

export interface RedisFolderStateMode {
  key: string;
  visibleCount?: number;
  isExpanded?: boolean;
}

export interface RedisTreeModel {
  treeKeySeparator: string;
  root: RedisFolderNodeModel;
  dirsByKey: { [key: string]: RedisFolderNodeModel };
  dirStateByKey: { [key: string]: RedisFolderStateMode };
  childrenByKey: { [key: string]: RedisNodeModel[] };
  keyObjectsByKey: { [key: string]: RedisNodeModel };
  scannedKeys: number;
  loadCount: number;
  dbsize: number;
  cursor: string;
  loadedAll: boolean;
  // refreshAll?: boolean;
}

export type RedisNodeModel = RedisLeafNodeModel | RedisFolderNodeModel;

export interface RedisLoadedModel {
  key: string;

  type: 'string' | 'hash' | 'set' | 'list' | 'zset' | 'stream' | 'binary' | 'ReJSON-RL';
  count?: number;
}

export interface RedisLoadResult {
  nextCursor: string;
  keys: RedisLoadedModel[];
  dbsize: number;
}

export type RedisChangeModelFunction = (func: (model: RedisTreeModel) => RedisTreeModel, loadNextPage: boolean) => void;

export function redis_mergeNextPage(tree: RedisTreeModel, nextPage: RedisLoadResult): RedisTreeModel {
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

  const dirsByKey: { [key: string]: RedisFolderNodeModel } = {};
  const childrenByKey: { [key: string]: RedisNodeModel[] } = {};

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

export function redis_markNodeExpanded(tree: RedisTreeModel, root: string, isExpanded: boolean): RedisTreeModel {
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

export function redis_showNextItems(tree: RedisTreeModel, root: string): RedisTreeModel {
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

export function redis_createNewModel(treeKeySeparator: string): RedisTreeModel {
  const root: RedisFolderNodeModel = {
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

export function redis_clearLoadedData(tree: RedisTreeModel): RedisTreeModel {
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

function addFlatItems(tree: RedisTreeModel, root: string, res: RedisNodeModel[], visitedRoots: string[] = []) {
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

export function redis_getFlatList(tree: RedisTreeModel) {
  const res: RedisNodeModel[] = [];
  addFlatItems(tree, '', res);
  return res;
}

export interface SupportedRedisKeyType {
  name: string;
  label: string;
  dbKeyFields: {
    name: string;
    cols?: number;
    label?: string;
    placeholder?: string;
  }[];
  dbKeyFieldsForGrid?: {
    name: string;
    cols?: number;
    label?: string;
  }[];
  keyColumn?: string;
  showItemList?: boolean;
  showGeneratedId?: boolean;
}

export const supportedRedisKeyTypes: SupportedRedisKeyType[] = [
  {
    name: 'string',
    label: 'String',
    dbKeyFields: [{ name: 'value' }],
  },
  {
    name: 'list',
    label: 'List',
    dbKeyFields: [{ name: 'value', cols: 12 }],
    showItemList: true,
  },
  {
    name: 'set',
    label: 'Set',
    dbKeyFields: [{ name: 'value', cols: 12 }],
    keyColumn: 'value',
    showItemList: true,
  },
  {
    name: 'zset',
    label: 'Sorted Set',
    dbKeyFields: [
      { name: 'member', cols: 8 },
      { name: 'score', cols: 4 },
    ],
    keyColumn: 'member',
    showItemList: true,
  },
  {
    name: 'hash',
    label: 'Hash',
    dbKeyFields: [
      { name: 'key', cols: 3, label: 'Field' },
      { name: 'value', cols: 7 },
      { name: 'ttl', cols: 2, label: 'TTL' },
    ],
    keyColumn: 'key',
    showItemList: true,
  },
  {
    name: 'stream',
    label: 'Stream',
    dbKeyFields: [
      { name: 'field', cols: 6 },
      { name: 'value', cols: 6 },
    ],
    dbKeyFieldsForGrid: [
      { name: 'id', cols: 6 },
      { name: 'value', cols: 6 },
    ],
    keyColumn: 'id',
    showItemList: true,
    showGeneratedId: true,
  },
  {
    name: 'json',
    label: 'JSON',
    dbKeyFields: [{ name: 'value' }],
  },
];

export function findSupportedRedisKeyType(type: string): SupportedRedisKeyType | undefined {
  return supportedRedisKeyTypes.find(t => t.name === type);
}
