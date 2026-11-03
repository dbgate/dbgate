// Connection folders - folder path uses "/" as separator (eg. "Prod/EU")

export interface FolderTreeNode {
  path: string;
  name: string;
  children: FolderTreeNode[];
}

export function normalizeFolderPath(path: string): string {
  if (path == null) return '';
  return String(path)
    .split('/')
    .map(x => x.trim())
    .filter(x => x)
    .join('/');
}

export function getParentFolderPath(path: string): string {
  const normalized = normalizeFolderPath(path);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.substring(0, index) : '';
}

export function getFolderName(path: string): string {
  const normalized = normalizeFolderPath(path);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.substring(index + 1) : normalized;
}

export function isFolderSameOrDescendant(path: string, ancestor: string): boolean {
  return path == ancestor || (path || '').startsWith(ancestor + '/');
}

export function replaceFolderPathPrefix(path: string, folder: string, newFolder: string): string {
  if (!isFolderSameOrDescendant(path, folder)) return path;
  return normalizeFolderPath((newFolder || '') + '/' + path.substring(folder.length));
}

export function replaceFolderPathPrefixInList(list: string[], folder: string, newFolder: string): string[] {
  const res = [];
  for (const item of list || []) {
    const replaced = replaceFolderPathPrefix(item, folder, newFolder);
    if (replaced && !res.includes(replaced)) res.push(replaced);
  }
  return res;
}

export function sortFolderPaths(paths: string[], order: string[]): string[] {
  const orderIndex = new Map<string, number>();
  for (const item of order || []) {
    if (!orderIndex.has(item)) orderIndex.set(item, orderIndex.size);
  }
  return [...paths].sort((a, b) => {
    const ia = orderIndex.get(a);
    const ib = orderIndex.get(b);
    if (ia != null && ib != null) return ia - ib;
    if (ia != null) return -1;
    if (ib != null) return 1;
    const la = a.toLowerCase();
    const lb = b.toLowerCase();
    if (la < lb) return -1;
    if (la > lb) return 1;
    return 0;
  });
}

export function buildFolderTree(folderPaths: string[], order: string[]): FolderTreeNode[] {
  const allPaths = new Set<string>();
  for (const item of folderPaths || []) {
    let path = normalizeFolderPath(item);
    while (path) {
      allPaths.add(path);
      path = getParentFolderPath(path);
    }
  }

  const childrenByParent = new Map<string, string[]>();
  for (const path of allPaths) {
    const parent = getParentFolderPath(path);
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent).push(path);
  }

  const createNodes = (parent: string): FolderTreeNode[] =>
    sortFolderPaths(childrenByParent.get(parent) || [], order).map(path => ({
      path,
      name: getFolderName(path),
      children: createNodes(path),
    }));

  return createNodes('');
}

export function canMoveFolder(source: string, targetParent: string): boolean {
  if (isFolderSameOrDescendant(targetParent, source)) return false;
  if (getParentFolderPath(source) == targetParent) return false;
  return true;
}

export function computeFolderMove(source: string, targetParent: string): string {
  const name = getFolderName(source);
  return targetParent ? targetParent + '/' + name : name;
}

export function reorderFolderList(
  order: string[],
  siblings: string[],
  source: string,
  target: string,
  position: 'before' | 'after'
): string[] {
  const sequence = sortFolderPaths(siblings, order).filter(x => x != source);
  const targetIndex = sequence.indexOf(target);
  if (targetIndex < 0) {
    sequence.push(source);
  } else {
    sequence.splice(position == 'before' ? targetIndex : targetIndex + 1, 0, source);
  }
  return [...(order || []).filter(x => !sequence.includes(x)), ...sequence];
}
