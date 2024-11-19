import _ from 'lodash';
import { DbDiffOptions, generateTablePairingId, hasDeletedPrefix } from './diffTools';
import {
  AlterProcessor,
  ColumnInfo,
  ConstraintInfo,
  DatabaseInfo,
  SqlObjectInfo,
  SqlDialect,
  TableInfo,
  NamedObjectInfo,
} from '../../types';
import { DatabaseInfoAlterProcessor } from './database-info-alter-processor';
import { DatabaseAnalyser } from './DatabaseAnalyser';

interface AlterOperation_CreateTable {
  operationType: 'createTable';
  newObject: TableInfo;
}

interface AlterOperation_DropTable {
  operationType: 'dropTable';
  oldObject: TableInfo;
}

interface AlterOperation_CreateSqlObject {
  operationType: 'createSqlObject';
  newObject: SqlObjectInfo;
}

interface AlterOperation_DropSqlObject {
  operationType: 'dropSqlObject';
  oldObject: SqlObjectInfo;
}

interface AlterOperation_RenameTable {
  operationType: 'renameTable';
  object: TableInfo;
  newName: string;
}

interface AlterOperation_RenameSqlObject {
  operationType: 'renameSqlObject';
  object: SqlObjectInfo;
  newName: string;
}

interface AlterOperation_CreateColumn {
  operationType: 'createColumn';
  newObject: ColumnInfo;
}

interface AlterOperation_ChangeColumn {
  operationType: 'changeColumn';
  oldObject: ColumnInfo;
  newObject: ColumnInfo;
}

interface AlterOperation_RenameColumn {
  operationType: 'renameColumn';
  object: ColumnInfo;
  newName: string;
}

interface AlterOperation_DropColumn {
  operationType: 'dropColumn';
  oldObject: ColumnInfo;
}

interface AlterOperation_CreateConstraint {
  operationType: 'createConstraint';
  newObject: ConstraintInfo;
}

interface AlterOperation_ChangeConstraint {
  operationType: 'changeConstraint';
  oldObject: ConstraintInfo;
  newObject: ConstraintInfo;
}

interface AlterOperation_DropConstraint {
  operationType: 'dropConstraint';
  oldObject: ConstraintInfo;
  isRecreate?: boolean;
}

interface AlterOperation_RenameConstraint {
  operationType: 'renameConstraint';
  object: ConstraintInfo;
  newName: string;
}
interface AlterOperation_RecreateTable {
  operationType: 'recreateTable';
  table: TableInfo;
  operations: AlterOperation[];
}
interface AlterOperation_FillPreloadedRows {
  operationType: 'fillPreloadedRows';
  table: NamedObjectInfo;
  oldRows: any[];
  newRows: any[];
  key: string[];
  insertOnly: string[];
  autoIncrementColumn: string;
}

interface AlterOperation_SetTableOption {
  operationType: 'setTableOption';
  table: TableInfo;
  optionName: string;
  optionValue: string;
}

export type AlterOperation =
  | AlterOperation_CreateColumn
  | AlterOperation_ChangeColumn
  | AlterOperation_DropColumn
  | AlterOperation_CreateConstraint
  | AlterOperation_ChangeConstraint
  | AlterOperation_DropConstraint
  | AlterOperation_CreateTable
  | AlterOperation_DropTable
  | AlterOperation_RenameTable
  | AlterOperation_RenameColumn
  | AlterOperation_RenameConstraint
  | AlterOperation_CreateSqlObject
  | AlterOperation_DropSqlObject
  | AlterOperation_RecreateTable
  | AlterOperation_FillPreloadedRows
  | AlterOperation_SetTableOption
  | AlterOperation_RenameSqlObject;

export class AlterPlan {
  recreates = {
    tables: 0,
    constraints: 0,
    sqlObjects: 0,
  };

  public operations: AlterOperation[] = [];
  constructor(
    public wholeOldDb: DatabaseInfo,
    public wholeNewDb: DatabaseInfo,
    public dialect: SqlDialect,
    public opts: DbDiffOptions
  ) {}

  createTable(table: TableInfo) {
    this.operations.push({
      operationType: 'createTable',
      newObject: table,
    });
  }

  dropTable(table: TableInfo) {
    this.operations.push({
      operationType: 'dropTable',
      oldObject: table,
    });
  }

  createSqlObject(obj: SqlObjectInfo) {
    this.operations.push({
      operationType: 'createSqlObject',
      newObject: obj,
    });
  }

  dropSqlObject(obj: SqlObjectInfo) {
    this.operations.push({
      operationType: 'dropSqlObject',
      oldObject: obj,
    });
  }

  createColumn(column: ColumnInfo) {
    this.operations.push({
      operationType: 'createColumn',
      newObject: column,
    });
  }

  changeColumn(oldColumn: ColumnInfo, newColumn: ColumnInfo) {
    this.operations.push({
      operationType: 'changeColumn',
      oldObject: oldColumn,
      newObject: newColumn,
    });
  }

  dropColumn(column: ColumnInfo) {
    this.operations.push({
      operationType: 'dropColumn',
      oldObject: column,
    });
  }

  createConstraint(constraint: ConstraintInfo) {
    this.operations.push({
      operationType: 'createConstraint',
      newObject: constraint,
    });
  }

  changeConstraint(oldConstraint: ConstraintInfo, newConstraint: ConstraintInfo) {
    this.operations.push({
      operationType: 'changeConstraint',
      oldObject: oldConstraint,
      newObject: newConstraint,
    });
  }

  dropConstraint(constraint: ConstraintInfo) {
    this.operations.push({
      operationType: 'dropConstraint',
      oldObject: constraint,
    });
  }

  renameTable(table: TableInfo, newName: string) {
    this.operations.push({
      operationType: 'renameTable',
      object: table,
      newName,
    });
  }

  renameSqlObject(table: TableInfo, newName: string) {
    this.operations.push({
      operationType: 'renameSqlObject',
      object: table,
      newName,
    });
  }

  renameColumn(column: ColumnInfo, newName: string) {
    this.operations.push({
      operationType: 'renameColumn',
      object: column,
      newName,
    });
  }

  renameConstraint(constraint: ConstraintInfo, newName: string) {
    this.operations.push({
      operationType: 'renameConstraint',
      object: constraint,
      newName,
    });
  }

  recreateTable(table: TableInfo, operations: AlterOperation[]) {
    this.operations.push({
      operationType: 'recreateTable',
      table,
      operations,
    });
    this.recreates.tables += 1;
  }

  fillPreloadedRows(
    table: NamedObjectInfo,
    oldRows: any[],
    newRows: any[],
    key: string[],
    insertOnly: string[],
    autoIncrementColumn: string
  ) {
    this.operations.push({
      operationType: 'fillPreloadedRows',
      table,
      oldRows,
      newRows,
      key,
      insertOnly,
      autoIncrementColumn,
    });
  }

  setTableOption(table: TableInfo, optionName: string, optionValue: string) {
    this.operations.push({
      operationType: 'setTableOption',
      table,
      optionName,
      optionValue,
    });
  }

  run(processor: AlterProcessor) {
    for (const op of this.operations) {
      runAlterOperation(op, processor);
    }
  }

  _getDependendColumnConstraints(column: ColumnInfo, dependencyDefinition) {
    const table = this.wholeOldDb.tables.find(x => x.pureName == column.pureName && x.schemaName == column.schemaName);
    if (!table) return [];
    const fks = dependencyDefinition?.includes('dependencies')
      ? table.dependencies.filter(fk => fk.columns.find(col => col.refColumnName == column.columnName))
      : [];
    const constraints = _.compact([
      dependencyDefinition?.includes('primaryKey') ? table.primaryKey : null,
      dependencyDefinition?.includes('sortingKey') ? table.sortingKey : null,
      ...(dependencyDefinition?.includes('foreignKeys') ? table.foreignKeys : []),
      ...(dependencyDefinition?.includes('indexes') ? table.indexes : []),
      ...(dependencyDefinition?.includes('uniques') ? table.uniques : []),
    ]).filter(cnt => cnt.columns.find(col => col.columnName == column.columnName));

    return [...fks, ...constraints];
  }

  _addLogicalDependencies(): AlterOperation[] {
    const lists = this.operations.map(op => {
      if (op.operationType == 'dropColumn') {
        const constraints = this._getDependendColumnConstraints(op.oldObject, this.dialect.dropColumnDependencies);

        if (constraints.length > 0 && this.opts.noDropConstraint) {
          return [];
        }

        const res: AlterOperation[] = [
          ...constraints.map(oldObject => {
            const opRes: AlterOperation = {
              operationType: 'dropConstraint',
              oldObject,
            };
            return opRes;
          }),
          op,
        ];
        return res;
      }

      for (const [testedOperationType, testedDependencies, testedObject] of [
        ['changeColumn', this.dialect.changeColumnDependencies, (op as AlterOperation_ChangeColumn).oldObject],
        ['renameColumn', this.dialect.renameColumnDependencies, (op as AlterOperation_RenameColumn).object],
      ]) {
        if (op.operationType == testedOperationType) {
          const constraints = this._getDependendColumnConstraints(testedObject as ColumnInfo, testedDependencies);

          // if (constraints.length > 0 && this.opts.noDropConstraint) {
          //   return [];
          // }

          const res: AlterOperation[] = [
            ...constraints.map(oldObject => {
              const opRes: AlterOperation = {
                operationType: 'dropConstraint',
                oldObject,
                isRecreate: true,
              };
              return opRes;
            }),
            op,
            ..._.reverse([...constraints]).map(newObject => {
              const opRes: AlterOperation = {
                operationType: 'createConstraint',
                newObject,
              };
              return opRes;
            }),
          ];

          if (constraints.length > 0) {
            this.recreates.constraints += 1;
          }
          return res;
        }
      }

      if (op.operationType == 'dropTable') {
        return [
          ...(this.dialect.dropReferencesWhenDropTable
            ? (op.oldObject.dependencies || []).map(oldObject => {
                const opRes: AlterOperation = {
                  operationType: 'dropConstraint',
                  oldObject,
                };
                return opRes;
              })
            : []),
          op,
        ];
      }

      if (op.operationType == 'changeConstraint') {
        // if (this.opts.noDropConstraint) {
        //   // skip constraint recreate
        //   return [];
        // }

        this.recreates.constraints += 1;
        const opDrop: AlterOperation = {
          operationType: 'dropConstraint',
          oldObject: op.oldObject,
          isRecreate: true,
        };
        const opCreate: AlterOperation = {
          operationType: 'createConstraint',
          newObject: op.newObject,
        };
        return [opDrop, opCreate];
      }

      return [op];
    });

    return _.flatten(lists);
  }

  _transformToImplementedOps(): AlterOperation[] {
    const lists = this.operations.map(op => {
      return (
        this._testTableRecreate(op, 'createColumn', this.dialect.createColumn, 'newObject') ||
        this._testTableRecreate(op, 'dropColumn', this.dialect.dropColumn, 'oldObject') ||
        this._testTableRecreate(op, 'createConstraint', obj => this._canCreateConstraint(obj), 'newObject') ||
        this._testTableRecreate(op, 'dropConstraint', obj => this._canDropConstraint(obj), 'oldObject') ||
        this._testTableRecreate(op, 'changeColumn', this.dialect.changeColumn, 'newObject') ||
        // this._testTableRecreate(
        //   op,
        //   'changeColumn',
        //   obj => this._canChangeAutoIncrement(obj, op as AlterOperation_ChangeColumn),
        //   'newObject'
        // ) ||
        this._testTableRecreate(op, 'renameColumn', true, 'object') || [op]
      );
    });

    return _.flatten(lists);
  }

  _canCreateConstraint(cnt: ConstraintInfo) {
    if (cnt.constraintType == 'primaryKey') return this.dialect.createPrimaryKey;
    if (cnt.constraintType == 'sortingKey') return this.dialect.createPrimaryKey;
    if (cnt.constraintType == 'foreignKey') return this.dialect.createForeignKey;
    if (cnt.constraintType == 'index') return this.dialect.createIndex;
    if (cnt.constraintType == 'unique') return this.dialect.createUnique;
    if (cnt.constraintType == 'check') return this.dialect.createCheck;
    return null;
  }

  _canDropConstraint(cnt: ConstraintInfo) {
    if (cnt.constraintType == 'primaryKey') return this.dialect.dropPrimaryKey;
    if (cnt.constraintType == 'sortingKey') return this.dialect.dropPrimaryKey;
    if (cnt.constraintType == 'foreignKey') return this.dialect.dropForeignKey;
    if (cnt.constraintType == 'index') return this.dialect.dropIndex;
    if (cnt.constraintType == 'unique') return this.dialect.dropUnique;
    if (cnt.constraintType == 'check') return this.dialect.dropCheck;
    return null;
  }

  // _canChangeAutoIncrement(column: ColumnInfo, op: AlterOperation_ChangeColumn) {
  //   if (!!column.autoIncrement != !!op.oldObject.autoIncrement) {
  //     return this.dialect.changeAutoIncrement;
  //   }
  //   return null;
  // }

  _testTableRecreate(
    op: AlterOperation,
    operationType: string,
    isAllowed: boolean | Function,
    objectField: string
  ): AlterOperation[] | null {
    if (op.operationType == operationType) {
      if (_.isFunction(isAllowed)) {
        if (isAllowed(op[objectField])) return null;
      } else {
        if (isAllowed) return null;
      }

      // console.log('*****************RECREATED NEEDED', op, operationType, isAllowed);
      // console.log(this.dialect);

      if (this.opts.noDropTable && !this.opts.allowTableRecreate) {
        // skip this operation, as it cannot be achieved
        return [];
      }

      const table = this.wholeNewDb.tables.find(
        x => x.pureName == op[objectField].pureName && x.schemaName == op[objectField].schemaName
      );
      this.recreates.tables += 1;
      return [
        {
          operationType: 'recreateTable',
          table,
          operations: [op],
        },
      ];
    }
    return null;
  }

  _groupTableRecreations(): AlterOperation[] {
    const res = [];
    const recreates = {};
    for (const op of this.operations) {
      if (op.operationType == 'recreateTable' && op.table) {
        const existingRecreate = recreates[`${op.table.schemaName}||${op.table.pureName}`];
        if (existingRecreate) {
          existingRecreate.operations.push(...op.operations);
        } else {
          const recreate = {
            ...op,
            operations: [...op.operations],
          };
          res.push(recreate);
          recreates[`${op.table.schemaName}||${op.table.pureName}`] = recreate;
        }
      } else {
        // @ts-ignore
        const oldObject: TableInfo = op.oldObject || op.object;
        if (oldObject) {
          const recreated = recreates[`${oldObject.schemaName}||${oldObject.pureName}`];
          if (recreated) {
            recreated.operations.push(op);
            continue;
          }
        }
        res.push(op);
      }
    }
    return res;
  }

  _moveForeignKeysToLast(): AlterOperation[] {
    if (!this.dialect.createForeignKey) {
      return this.operations;
    }
    const fks = [];
    const res = this.operations
      .filter(op => op.operationType != 'createConstraint')
      .map(op => {
        if (op.operationType == 'createTable') {
          fks.push(...(op.newObject.foreignKeys || []));
          return {
            ...op,
            newObject: {
              ...op.newObject,
              foreignKeys: [],
            },
          };
        }
        return op;
      });

    return [
      ...res,
      ...this.operations.filter(op => op.operationType == 'createConstraint'),
      ...fks.map(
        fk =>
          ({
            operationType: 'createConstraint',
            newObject: fk,
          } as AlterOperation_CreateConstraint)
      ),
    ];
  }

  _filterAllowedOperations(): AlterOperation[] {
    return this.operations.filter(op => {
      if (this.opts.noDropColumn && op.operationType == 'dropColumn') return false;
      if (this.opts.noDropTable && op.operationType == 'dropTable') return false;
      if (this.opts.noDropTable && op.operationType == 'recreateTable') return false;
      if (this.opts.noDropConstraint && op.operationType == 'dropConstraint' && !op.isRecreate) return false;
      // if (
      //   this.opts.noDropSqlObject &&
      //   op.operationType == 'dropSqlObject' &&
      //   // allow to drop previously deleted SQL objects
      //   !hasDeletedPrefix(op.oldObject.pureName, this.opts, this.opts.deletedSqlObjectPrefix)
      // )
      //   return false;
      return true;
    });
  }

  transformPlan() {
    // console.log('*****************OPERATIONS0', this.operations);

    this.operations = this._addLogicalDependencies();

    // console.log('*****************OPERATIONS1', this.operations);

    this.operations = this._transformToImplementedOps();

    // console.log('*****************OPERATIONS2', this.operations);

    this.operations = this._groupTableRecreations();

    // console.log('*****************OPERATIONS3', this.operations);

    this.operations = this._moveForeignKeysToLast();

    // console.log('*****************OPERATIONS4', this.operations);

    this.operations = this._filterAllowedOperations();

    // console.log('*****************OPERATIONS5', this.operations);
  }
}

export function runAlterOperation(op: AlterOperation, processor: AlterProcessor) {
  switch (op.operationType) {
    case 'createTable':
      processor.createTable(op.newObject);
      break;
    case 'changeColumn':
      processor.changeColumn(op.oldObject, op.newObject);
      break;
    case 'createColumn':
      processor.createColumn(op.newObject, []);
      break;
    case 'dropColumn':
      processor.dropColumn(op.oldObject);
      break;
    case 'dropTable':
      processor.dropTable(op.oldObject);
      break;
    case 'changeConstraint':
      processor.changeConstraint(op.oldObject, op.newObject);
      break;
    case 'createConstraint':
      processor.createConstraint(op.newObject);
      break;
    case 'dropConstraint':
      processor.dropConstraint(op.oldObject);
      break;
    case 'renameColumn':
      processor.renameColumn(op.object, op.newName);
      break;
    case 'renameTable':
      processor.renameTable(op.object, op.newName);
      break;
    case 'renameSqlObject':
      processor.renameSqlObject(op.object, op.newName);
      break;
    case 'renameConstraint':
      processor.renameConstraint(op.object, op.newName);
      break;
    case 'createSqlObject':
      processor.createSqlObject(op.newObject);
      break;
    case 'dropSqlObject':
      processor.dropSqlObject(op.oldObject);
      break;
    case 'setTableOption':
      processor.setTableOption(op.table, op.optionName, op.optionValue);
      break;
    case 'fillPreloadedRows':
      processor.fillPreloadedRows(op.table, op.oldRows, op.newRows, op.key, op.insertOnly, op.autoIncrementColumn);
      break;
    case 'recreateTable':
      {
        const oldTable = generateTablePairingId(op.table);
        const newTable = _.cloneDeep(oldTable);
        const newDb = DatabaseAnalyser.createEmptyStructure();
        newDb.tables.push(newTable);
        // console.log('////////////////////////////newTable1', newTable);
        op.operations.forEach(child => runAlterOperation(child, new DatabaseInfoAlterProcessor(newDb)));
        // console.log('////////////////////////////op.operations', op.operations);
        // console.log('////////////////////////////op.table', op.table);
        // console.log('////////////////////////////newTable2', newTable);
        processor.recreateTable(oldTable, newTable);
      }
      break;
  }
}
