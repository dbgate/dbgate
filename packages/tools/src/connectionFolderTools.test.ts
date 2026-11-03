// Tests for connection folder paths - subfolders and custom folder order (dbgate/dbgate#1608)

const {
  normalizeFolderPath,
  getParentFolderPath,
  getFolderName,
  isFolderSameOrDescendant,
  replaceFolderPathPrefix,
  replaceFolderPathPrefixInList,
  sortFolderPaths,
  buildFolderTree,
  canMoveFolder,
  computeFolderMove,
  reorderFolderList,
} = require('./connectionFolderTools');

// only path + children, to compare tree shapes
function treeShape(nodes) {
  return nodes.map(node => ({ path: node.path, children: treeShape(node.children) }));
}

describe('normalizeFolderPath', () => {
  test('trims segments and drops empty ones', () => {
    expect(normalizeFolderPath(' A / /B/ ')).toBe('A/B');
    expect(normalizeFolderPath('/A//B/C/')).toBe('A/B/C');
    expect(normalizeFolderPath('Prod/EU')).toBe('Prod/EU');
    expect(normalizeFolderPath('  Team  ')).toBe('Team');
  });

  test('empty values give root', () => {
    expect(normalizeFolderPath(null)).toBe('');
    expect(normalizeFolderPath(undefined)).toBe('');
    expect(normalizeFolderPath('')).toBe('');
    expect(normalizeFolderPath('/')).toBe('');
    expect(normalizeFolderPath(' / / ')).toBe('');
  });
});

describe('getParentFolderPath / getFolderName', () => {
  test('returns parent path', () => {
    expect(getParentFolderPath('A/B')).toBe('A');
    expect(getParentFolderPath('A/B/C')).toBe('A/B');
    expect(getParentFolderPath('A')).toBe('');
  });

  test('returns leaf name', () => {
    expect(getFolderName('A/B')).toBe('B');
    expect(getFolderName('A/B/C')).toBe('C');
    expect(getFolderName('A')).toBe('A');
  });
});

describe('isFolderSameOrDescendant', () => {
  test('same folder and descendants', () => {
    expect(isFolderSameOrDescendant('A', 'A')).toBe(true);
    expect(isFolderSameOrDescendant('A/B', 'A')).toBe(true);
    expect(isFolderSameOrDescendant('A/B/C', 'A')).toBe(true);
    expect(isFolderSameOrDescendant('A/B/C', 'A/B')).toBe(true);
  });

  test('a folder with the same prefix in its name is not a descendant', () => {
    expect(isFolderSameOrDescendant('AB', 'A')).toBe(false);
    expect(isFolderSameOrDescendant('A', 'A/B')).toBe(false);
    expect(isFolderSameOrDescendant('B/A', 'A')).toBe(false);
  });
});

describe('replaceFolderPathPrefix', () => {
  test('rewrites the folder and its descendants', () => {
    expect(replaceFolderPathPrefix('A', 'A', 'X/A')).toBe('X/A');
    expect(replaceFolderPathPrefix('A/B', 'A', 'X/A')).toBe('X/A/B');
    expect(replaceFolderPathPrefix('A/B/C', 'A/B', 'D')).toBe('D/C');
  });

  test('does not touch other folders', () => {
    expect(replaceFolderPathPrefix('AB', 'A', 'X/A')).toBe('AB');
    expect(replaceFolderPathPrefix('B/A', 'A', 'X/A')).toBe('B/A');
    expect(replaceFolderPathPrefix('C', 'A', 'X/A')).toBe('C');
  });

  test('moves to root when newFolder is empty', () => {
    expect(replaceFolderPathPrefix('A/B', 'A', '')).toBe('B');
    expect(replaceFolderPathPrefix('A/B/C', 'A', '')).toBe('B/C');
    expect(replaceFolderPathPrefix('A', 'A', '')).toBe('');
  });

  test('normalizes the result', () => {
    expect(replaceFolderPathPrefix('A/B', 'A', ' X / ')).toBe('X/B');
  });
});

describe('replaceFolderPathPrefixInList', () => {
  test('rewrites matching entries and keeps the order', () => {
    expect(replaceFolderPathPrefixInList(['C', 'A', 'AB', 'A/B'], 'A', 'X/A')).toEqual(['C', 'X/A', 'AB', 'X/A/B']);
  });

  test('drops empty results', () => {
    expect(replaceFolderPathPrefixInList(['A', 'A/B', 'C'], 'A', '')).toEqual(['B', 'C']);
  });

  test('deduplicates (folders merge)', () => {
    expect(replaceFolderPathPrefixInList(['A', 'A/B', 'X/A', 'C'], 'A', 'X/A')).toEqual(['X/A', 'X/A/B', 'C']);
    expect(replaceFolderPathPrefixInList(['A', 'B'], 'A', 'B')).toEqual(['B']);
  });
});

describe('sortFolderPaths', () => {
  test('empty order gives case-insensitive alphabetical order', () => {
    expect(sortFolderPaths(['b', 'C', 'a'], [])).toEqual(['a', 'b', 'C']);
    expect(sortFolderPaths(['Zeta', 'alpha', 'Beta'], [])).toEqual(['alpha', 'Beta', 'Zeta']);
  });

  test('listed paths first in listed order, others alphabetical', () => {
    expect(sortFolderPaths(['a', 'b', 'c', 'd'], ['c', 'a'])).toEqual(['c', 'a', 'b', 'd']);
    expect(sortFolderPaths(['Prod', 'dev', 'Test', 'archive'], ['Test'])).toEqual(['Test', 'archive', 'dev', 'Prod']);
  });

  test('stale entries in order are ignored', () => {
    expect(sortFolderPaths(['a', 'b', 'c'], ['x', 'c', 'y/z'])).toEqual(['c', 'a', 'b']);
  });

  test('works with nested paths', () => {
    expect(sortFolderPaths(['P/a', 'P/b', 'P/c'], ['P/b', 'b'])).toEqual(['P/b', 'P/a', 'P/c']);
  });
});

describe('buildFolderTree', () => {
  test('flat folders', () => {
    const tree = buildFolderTree(['b', 'a'], []);
    expect(tree).toEqual([
      { path: 'a', name: 'a', children: [] },
      { path: 'b', name: 'b', children: [] },
    ]);
  });

  test('nested folders with leaf names', () => {
    const tree = buildFolderTree(['Prod', 'Prod/EU', 'Prod/US'], []);
    expect(tree).toEqual([
      {
        path: 'Prod',
        name: 'Prod',
        children: [
          { path: 'Prod/EU', name: 'EU', children: [] },
          { path: 'Prod/US', name: 'US', children: [] },
        ],
      },
    ]);
  });

  test('creates missing ancestors', () => {
    const tree = buildFolderTree(['A/B/C'], []);
    expect(tree).toEqual([
      {
        path: 'A',
        name: 'A',
        children: [{ path: 'A/B', name: 'B', children: [{ path: 'A/B/C', name: 'C', children: [] }] }],
      },
    ]);
  });

  test('normalizes and deduplicates input paths', () => {
    const tree = buildFolderTree([' A / B ', 'A/B', '/A/', 'A//B/', '', null], []);
    expect(treeShape(tree)).toEqual([{ path: 'A', children: [{ path: 'A/B', children: [] }] }]);
    expect(tree[0].children[0].name).toBe('B');
  });

  test('siblings ordered by the order setting at every level', () => {
    const tree = buildFolderTree(['a', 'b', 'c', 'b/x', 'b/y', 'b/z'], ['c', 'b/z', 'stale', 'b/y']);
    expect(treeShape(tree)).toEqual([
      { path: 'c', children: [] },
      {
        path: 'a',
        children: [],
      },
      {
        path: 'b',
        children: [
          { path: 'b/z', children: [] },
          { path: 'b/y', children: [] },
          { path: 'b/x', children: [] },
        ],
      },
    ]);
  });

  test('unordered siblings are case-insensitive alphabetical', () => {
    const tree = buildFolderTree(['P/beta', 'P/Alpha', 'P/gamma'], []);
    expect(tree[0].children.map(x => x.name)).toEqual(['Alpha', 'beta', 'gamma']);
  });
});

describe('canMoveFolder', () => {
  test('refuses moving into itself or a descendant', () => {
    expect(canMoveFolder('A', 'A')).toBe(false);
    expect(canMoveFolder('A', 'A/B')).toBe(false);
    expect(canMoveFolder('A', 'A/B/C')).toBe(false);
    expect(canMoveFolder('A/B', 'A/B/C')).toBe(false);
  });

  test('refuses moving into its current parent', () => {
    expect(canMoveFolder('A/B', 'A')).toBe(false);
    expect(canMoveFolder('A', '')).toBe(false);
    expect(canMoveFolder('A/B/C', 'A/B')).toBe(false);
  });

  test('allows other moves', () => {
    expect(canMoveFolder('A', 'B')).toBe(true);
    expect(canMoveFolder('A', 'AB')).toBe(true);
    expect(canMoveFolder('AB', 'A')).toBe(true);
    expect(canMoveFolder('A/B', 'C/D')).toBe(true);
    expect(canMoveFolder('A/B/C', 'A')).toBe(true);
  });

  test('allows moving a nested folder to root', () => {
    expect(canMoveFolder('A/B', '')).toBe(true);
    expect(canMoveFolder('A/B/C', '')).toBe(true);
  });
});

describe('computeFolderMove', () => {
  test('returns target/name', () => {
    expect(computeFolderMove('A', 'B')).toBe('B/A');
    expect(computeFolderMove('A/B', 'C/D')).toBe('C/D/B');
    expect(computeFolderMove('A/B/C', 'A')).toBe('A/C');
  });

  test('returns name for root', () => {
    expect(computeFolderMove('A/B', '')).toBe('B');
    expect(computeFolderMove('A/B/C', '')).toBe('C');
  });
});

describe('reorderFolderList', () => {
  // order of the given paths as they appear in the list
  function sequenceOf(list, paths) {
    return list.filter(x => paths.includes(x));
  }

  test('moves source before target (no order yet)', () => {
    const siblings = ['a', 'b', 'c', 'd'];
    const res = reorderFolderList([], siblings, 'd', 'b', 'before');
    expect(sequenceOf(res, siblings)).toEqual(['a', 'd', 'b', 'c']);
  });

  test('moves source after target (no order yet)', () => {
    const siblings = ['a', 'b', 'c', 'd'];
    const res = reorderFolderList([], siblings, 'a', 'c', 'after');
    expect(sequenceOf(res, siblings)).toEqual(['b', 'c', 'a', 'd']);
  });

  test('moves to the first and last position', () => {
    const siblings = ['a', 'b', 'c'];
    expect(sequenceOf(reorderFolderList([], siblings, 'c', 'a', 'before'), siblings)).toEqual(['c', 'a', 'b']);
    expect(sequenceOf(reorderFolderList([], siblings, 'a', 'c', 'after'), siblings)).toEqual(['b', 'c', 'a']);
  });

  test('starts from the current order of siblings', () => {
    const siblings = ['a', 'b', 'c', 'd'];
    // current visual order: c, a, b, d
    const res = reorderFolderList(['c', 'a'], siblings, 'd', 'a', 'before');
    expect(sequenceOf(res, siblings)).toEqual(['c', 'd', 'a', 'b']);
  });

  test('the result sorts siblings in the new sequence', () => {
    const siblings = ['a', 'b', 'c', 'd'];
    const res = reorderFolderList(['c', 'a'], siblings, 'b', 'c', 'before');
    expect(sortFolderPaths(siblings, res)).toEqual(['b', 'c', 'a', 'd']);
  });

  test('preserves entries for other levels', () => {
    const order = ['X/2', 'P/b', 'top', 'X/1', 'P/a'];
    const siblings = ['P/a', 'P/b', 'P/c'];
    const res = reorderFolderList(order, siblings, 'P/c', 'P/b', 'before');
    expect(sequenceOf(res, siblings)).toEqual(['P/c', 'P/b', 'P/a']);
    expect(sequenceOf(res, ['X/2', 'top', 'X/1'])).toEqual(['X/2', 'top', 'X/1']);
    expect(res).toHaveLength(order.length + 1);
    expect(sortFolderPaths(['X/1', 'X/2'], res)).toEqual(['X/2', 'X/1']);
  });

  test('does not contain duplicates', () => {
    const order = ['b', 'a', 'other/x'];
    const siblings = ['a', 'b', 'c'];
    const res = reorderFolderList(order, siblings, 'a', 'b', 'before');
    expect(new Set(res).size).toBe(res.length);
    expect(sequenceOf(res, siblings)).toEqual(['a', 'b', 'c']);
    expect(res).toContain('other/x');
  });

  test('works with nested sibling paths', () => {
    const siblings = ['Prod/EU', 'Prod/US', 'Prod/Asia'];
    const res = reorderFolderList([], siblings, 'Prod/EU', 'Prod/US', 'after');
    expect(sortFolderPaths(siblings, res)).toEqual(['Prod/Asia', 'Prod/US', 'Prod/EU']);
  });
});
