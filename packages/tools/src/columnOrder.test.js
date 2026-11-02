const { getColumnMoves, createAlterTablePlan, generateTablePairingId } = require('./diffTools');
const { runAlterOperation } = require('./alterPlan');
const { DatabaseInfoAlterProcessor } = require('./database-info-alter-processor');

function applyMoves(order, moves) {
  let res = [...order];
  for (const move of moves) {
    res = res.filter(x => x != move.columnName);
    const index = move.afterColumnName == null ? -1 : res.indexOf(move.afterColumnName);
    res.splice(index + 1, 0, move.columnName);
  }
  return res;
}

describe('getColumnMoves', () => {
  test('no moves for the same order', () => {
    expect(getColumnMoves(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([]);
  });

  test('move column up', () => {
    expect(getColumnMoves(['a', 'b', 'c'], ['a', 'c', 'b'])).toHaveLength(1);
    expect(applyMoves(['a', 'b', 'c'], getColumnMoves(['a', 'b', 'c'], ['a', 'c', 'b']))).toEqual(['a', 'c', 'b']);
  });

  test('move column to first position', () => {
    expect(getColumnMoves(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([{ columnName: 'c', afterColumnName: null }]);
  });

  test('move column to last position', () => {
    expect(getColumnMoves(['a', 'b', 'c'], ['b', 'c', 'a'])).toEqual([{ columnName: 'a', afterColumnName: 'c' }]);
  });

  test('ignores columns not present in target', () => {
    const moves = getColumnMoves(['a', 'deleted', 'b', 'c'], ['b', 'a', 'c']);
    expect(moves).toHaveLength(1);
    expect(applyMoves(['a', 'deleted', 'b', 'c'], moves).filter(x => x != 'deleted')).toEqual(['b', 'a', 'c']);
  });

  test('random permutations are transformed into target order', () => {
    for (let iteration = 0; iteration < 200; iteration++) {
      const count = 1 + (iteration % 10);
      const current = Array.from({ length: count }, (_, i) => `c${i}`);
      const target = [...current].sort(() => Math.random() - 0.5);
      expect(applyMoves(current, getColumnMoves(current, target))).toEqual(target);
    }
  });
});

describe('column order in alter table plan', () => {
  const column = (columnName, extra = {}) => ({
    pureName: 't1',
    schemaName: null,
    columnName,
    dataType: 'int',
    notNull: false,
    ...extra,
  });

  const oldTable = generateTablePairingId({
    pureName: 't1',
    schemaName: null,
    objectTypeField: 'tables',
    columns: [column('id', { notNull: true }), column('a'), column('b'), column('c')],
    foreignKeys: [],
    indexes: [],
    uniques: [],
    checks: [],
    dependencies: [],
  });

  function createDriver(changeColumnPosition) {
    return {
      dialect: {
        createColumn: true,
        dropColumn: true,
        changeColumn: true,
        changeColumnPosition,
      },
    };
  }

  function getPlan(newColumns, changeColumnPosition = true, opts = { checkColumnOrder: true }) {
    const newTable = { ...oldTable, columns: newColumns };
    const db = { tables: [oldTable], views: [], procedures: [], functions: [], triggers: [], matviews: [] };
    return createAlterTablePlan(oldTable, newTable, opts, db, db, createDriver(changeColumnPosition));
  }

  function applyPlan(plan) {
    const db = { tables: [JSON.parse(JSON.stringify(oldTable))] };
    const processor = new DatabaseInfoAlterProcessor(db);
    for (const op of plan.operations) runAlterOperation(op, processor);
    return db.tables[0].columns.map(x => x.columnName);
  }

  const [id, a, b, c] = oldTable.columns;

  test('moved column generates changeColumnPosition', () => {
    const plan = getPlan([id, c, a, b]);
    expect(plan.operations).toEqual([{ operationType: 'changeColumnPosition', column: c, afterColumnName: 'id' }]);
    expect(applyPlan(plan)).toEqual(['id', 'c', 'a', 'b']);
  });

  test('new column in the middle is moved after creation', () => {
    const d = column('d', { pairingId: 'new-d' });
    const plan = getPlan([id, a, d, b, c]);
    expect(plan.operations.map(x => x.operationType)).toEqual(['createColumn', 'changeColumnPosition']);
    expect(applyPlan(plan)).toEqual(['id', 'a', 'd', 'b', 'c']);
  });

  test('renamed and moved column', () => {
    const plan = getPlan([{ ...b, columnName: 'b2' }, id, a, c]);
    expect(plan.operations.map(x => x.operationType)).toEqual(['renameColumn', 'changeColumnPosition']);
    expect(applyPlan(plan)).toEqual(['b2', 'id', 'a', 'c']);
  });

  test('dropped column does not cause moves', () => {
    const plan = getPlan([id, b, c]);
    expect(plan.operations.map(x => x.operationType)).toEqual(['dropColumn']);
  });

  test('no moves when dialect does not support it', () => {
    expect(getPlan([id, c, a, b], false).operations).toEqual([]);
  });

  test('no moves without checkColumnOrder option', () => {
    expect(getPlan([id, c, a, b], true, {}).operations).toEqual([]);
  });
});
