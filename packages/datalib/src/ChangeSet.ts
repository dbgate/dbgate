import _ from 'lodash';
import {
  Command,
  Insert,
  Update,
  Delete,
  UpdateField,
  Condition,
  AllowIdentityInsert,
  Expression,
} from 'dbgate-sqltree';
import type { NamedObjectInfo, DatabaseInfo, TableInfo } from 'dbgate-types';
import { JsonDataObjectUpdateCommand } from 'dbgate-tools';

export interface ChangeSetItem {
  pureName: string;
  schemaName?: string;
  insertedRowIndex?: number;
  existingRowIndex?: number;
  document?: any;
  condition?: { [column: string]: string };
  fields?: { [column: string]: string };
  insertIfNotExistsFields?: { [column: string]: string };
}

export interface ChangeSetItemFields {
  inserts: ChangeSetItem[];
  updates: ChangeSetItem[];
  deletes: ChangeSetItem[];
}

export interface ChangeSet extends ChangeSetItemFields {
  structure?: TableInfo;
  dataUpdateCommands?: JsonDataObjectUpdateCommand[];
  setColumnMode?: 'fixed' | 'variable';
}

export function createChangeSet(): ChangeSet {
  return {
    inserts: [],
    updates: [],
    deletes: [],
  };
}

export interface ChangeSetRowDefinition {
  pureName: string;
  schemaName: string;
  insertedRowIndex?: number;
  existingRowIndex?: number;
  condition?: { [column: string]: string };
}

export interface ChangeSetFieldDefinition extends ChangeSetRowDefinition {
  uniqueName: string;
  columnName: string;
}

export function findExistingChangeSetItem(
  changeSet: ChangeSet,
  definition: ChangeSetRowDefinition
): [keyof ChangeSetItemFields, ChangeSetItem] {
  if (!changeSet || !definition) return ['updates', null];
  if (definition.insertedRowIndex != null) {
    return [
      'inserts',
      changeSet.inserts.find(
        x =>
          x.pureName == definition.pureName &&
          x.schemaName == definition.schemaName &&
          x.insertedRowIndex == definition.insertedRowIndex
      ),
    ];
  } else {
    const inUpdates = changeSet.updates.find(
      x =>
        x.pureName == definition.pureName &&
        x.schemaName == definition.schemaName &&
        ((definition.existingRowIndex != null && x.existingRowIndex == definition.existingRowIndex) ||
          (definition.existingRowIndex == null && _.isEqual(x.condition, definition.condition)))
    );
    if (inUpdates) return ['updates', inUpdates];

    const inDeletes = changeSet.deletes.find(
      x =>
        x.pureName == definition.pureName &&
        x.schemaName == definition.schemaName &&
        ((definition.existingRowIndex != null && x.existingRowIndex == definition.existingRowIndex) ||
          (definition.existingRowIndex == null && _.isEqual(x.condition, definition.condition)))
    );
    if (inDeletes) return ['deletes', inDeletes];

    return ['updates', null];
  }
}

export function setChangeSetValue(
  changeSet: ChangeSet,
  definition: ChangeSetFieldDefinition,
  value: string
): ChangeSet {
  if (!changeSet || !definition) return changeSet;
  let [fieldName, existingItem] = findExistingChangeSetItem(changeSet, definition);
  if (fieldName == 'deletes') {
    changeSet = revertChangeSetRowChanges(changeSet, definition);
    [fieldName, existingItem] = findExistingChangeSetItem(changeSet, definition);
  }
  if (existingItem) {
    return {
      ...changeSet,
      [fieldName]: changeSet[fieldName].map(item =>
        item == existingItem
          ? {
              ...item,
              fields: {
                ...item.fields,
                [definition.uniqueName]: value,
              },
            }
          : item
      ),
    };
  }

  return {
    ...changeSet,
    [fieldName]: [
      ...changeSet[fieldName],
      {
        pureName: definition.pureName,
        schemaName: definition.schemaName,
        condition: definition.condition,
        insertedRowIndex: definition.insertedRowIndex,
        existingRowIndex: definition.existingRowIndex,
        fields: {
          [definition.uniqueName]: value,
        },
      },
    ],
  };
}

export function setChangeSetRowData(
  changeSet: ChangeSet,
  definition: ChangeSetRowDefinition,
  document: any
): ChangeSet {
  if (!changeSet || !definition) return changeSet;
  let [fieldName, existingItem] = findExistingChangeSetItem(changeSet, definition);
  if (fieldName == 'deletes') {
    changeSet = revertChangeSetRowChanges(changeSet, definition);
    [fieldName, existingItem] = findExistingChangeSetItem(changeSet, definition);
  }
  if (existingItem) {
    return {
      ...changeSet,
      [fieldName]: changeSet[fieldName].map(item =>
        item == existingItem
          ? {
              ...item,
              fields: {},
              document,
            }
          : item
      ),
    };
  }

  return {
    ...changeSet,
    [fieldName]: [
      ...changeSet[fieldName],
      {
        pureName: definition.pureName,
        schemaName: definition.schemaName,
        condition: definition.condition,
        insertedRowIndex: definition.insertedRowIndex,
        existingRowIndex: definition.existingRowIndex,
        document,
      },
    ],
  };
}

// export function batchUpdateChangeSet(
//   changeSet: ChangeSet,
//   rowDefinitions: ChangeSetRowDefinition[],
//   dataRows: []
// ): ChangeSet {
//   const res = {
//     updates: [...changeSet.updates],
//     deletes: [...changeSet.deletes],
//     inserts: [...changeSet.inserts],
//   };
//   const rowItems: ChangeSetItem[] = rowDefinitions.map(definition => {
//     let [field, item] = findExistingChangeSetItem(res, definition);
//     let createUpdate = false;
//     if (field == 'deletes') {
//       res.deletes = res.deletes.filter(x => x != item);
//       createUpdate = true;
//     }
//     if (field == 'updates' && item == null) {
//       item = {
//         ...definition,
//         fields: {},
//       };
//       res.updates.push(item);
//     }
//     return item;
//   });
//   for (const tuple in _.zip(rowItems, dataRows)) {
//     const [definition, dataRow] = tuple;
//     for
//   }
//   return res;
// }

export function batchUpdateChangeSet(
  changeSet: ChangeSet,
  rowDefinitions: ChangeSetRowDefinition[],
  dataRows: []
): ChangeSet {
  // console.log('batchUpdateChangeSet', changeSet, rowDefinitions, dataRows);
  for (const tuple of _.zip(rowDefinitions, dataRows)) {
    const [definition, dataRow] = tuple;
    for (const key of _.keys(dataRow)) {
      changeSet = setChangeSetValue(changeSet, { ...definition, columnName: key, uniqueName: key }, dataRow[key]);
    }
  }
  return changeSet;
}

function extractFields(item: ChangeSetItem, allowNulls = true, allowedDocumentColumns: string[] = []): UpdateField[] {
  const allFields = {
    ...item.fields,
  };

  for (const docField in item.document || {}) {
    if (allowedDocumentColumns.includes(docField)) {
      allFields[docField] = item.document[docField];
    }
  }

  return _.keys(allFields)
    .filter(targetColumn => allowNulls || allFields[targetColumn] != null)
    .map(targetColumn => ({
      targetColumn,
      exprType: 'value',
      value: allFields[targetColumn],
    }));
}

function changeSetInsertToSql(
  item: ChangeSetItem,
  dbinfo: DatabaseInfo = null
): [AllowIdentityInsert, Insert, AllowIdentityInsert] {
  const table = dbinfo?.tables?.find(x => x.schemaName == item.schemaName && x.pureName == item.pureName);
  const fields = extractFields(
    item,
    false,
    table?.columns?.map(x => x.columnName)
  );
  if (fields.length == 0) return null;
  let autoInc = false;
  if (table) {
    const autoIncCol = table.columns.find(x => x.autoIncrement);
    // console.log('autoIncCol', autoIncCol);
    if (autoIncCol && fields.find(x => x.targetColumn == autoIncCol.columnName)) {
      autoInc = true;
    }
  }
  const targetTable = {
    pureName: item.pureName,
    schemaName: item.schemaName,
  };
  return [
    autoInc
      ? {
          targetTable,
          commandType: 'allowIdentityInsert',
          allow: true,
        }
      : null,
    {
      targetTable,
      commandType: 'insert',
      fields,
      insertWhereNotExistsCondition: item.insertIfNotExistsFields
        ? compileSimpleChangeSetCondition(item.insertIfNotExistsFields)
        : null,
    },
    autoInc
      ? {
          targetTable,
          commandType: 'allowIdentityInsert',
          allow: false,
        }
      : null,
  ];
}

export function extractChangeSetCondition(item: ChangeSetItem, alias?: string): Condition {
  function getColumnCondition(columnName: string): Condition {
    const value = item.condition[columnName];
    const expr: Expression = {
      exprType: 'column',
      columnName,
      source: {
        name: {
          pureName: item.pureName,
          schemaName: item.schemaName,
        },
        alias,
      },
    };
    if (value == null) {
      return {
        conditionType: 'isNull',
        expr,
      };
    } else {
      return {
        conditionType: 'binary',
        operator: '=',
        left: expr,
        right: {
          exprType: 'value',
          value,
        },
      };
    }
  }
  return {
    conditionType: 'and',
    conditions: _.keys(item.condition).map(columnName => getColumnCondition(columnName)),
  };
}

function compileSimpleChangeSetCondition(fields: { [column: string]: string }): Condition {
  function getColumnCondition(columnName: string): Condition {
    const value = fields[columnName];
    const expr: Expression = {
      exprType: 'column',
      columnName,
    };
    if (value == null) {
      return {
        conditionType: 'isNull',
        expr,
      };
    } else {
      return {
        conditionType: 'binary',
        operator: '=',
        left: expr,
        right: {
          exprType: 'value',
          value,
        },
      };
    }
  }
  return {
    conditionType: 'and',
    conditions: _.keys(fields).map(columnName => getColumnCondition(columnName)),
  };
}

function changeSetUpdateToSql(item: ChangeSetItem, dbinfo: DatabaseInfo = null): Update {
  const table = dbinfo?.tables?.find(x => x.schemaName == item.schemaName && x.pureName == item.pureName);

  return {
    from: {
      name: {
        pureName: item.pureName,
        schemaName: item.schemaName,
      },
    },
    commandType: 'update',
    fields: extractFields(
      item,
      true,
      table?.columns?.map(x => x.columnName)
    ),
    where: extractChangeSetCondition(item),
  };
}

function changeSetDeleteToSql(item: ChangeSetItem): Delete {
  return {
    from: {
      name: {
        pureName: item.pureName,
        schemaName: item.schemaName,
      },
    },
    commandType: 'delete',
    where: extractChangeSetCondition(item),
  };
}

export function changeSetToSql(changeSet: ChangeSet, dbinfo: DatabaseInfo): Command[] {
  return _.compact(
    _.flatten([
      ...(changeSet.inserts.map(item => changeSetInsertToSql(item, dbinfo)) as any),
      ...changeSet.updates.map(item => changeSetUpdateToSql(item, dbinfo)),
      ...changeSet.deletes.map(changeSetDeleteToSql),
    ])
  );
}

export function revertChangeSetRowChanges(changeSet: ChangeSet, definition: ChangeSetRowDefinition): ChangeSet {
  // console.log('definition', definition);
  const [field, item] = findExistingChangeSetItem(changeSet, definition);
  // console.log('field, item', field, item);
  // console.log('changeSet[field]', changeSet[field]);
  // console.log('changeSet[field] filtered', changeSet[field].filter((x) => x != item);
  if (item)
    return {
      ...changeSet,
      [field]: changeSet[field].filter(x => x != item),
    };
  return changeSet;
}

function consolidateInsertIndexes(changeSet: ChangeSet, name: NamedObjectInfo): ChangeSet {
  const indexes = changeSet.inserts
    .filter(x => x.pureName == name.pureName && x.schemaName == name.schemaName)
    .map(x => x.insertedRowIndex);

  indexes.sort((a, b) => a - b);
  if (indexes[indexes.length - 1] != indexes.length - 1) {
    return {
      ...changeSet,
      inserts: changeSet.inserts.map(x => ({
        ...x,
        insertedRowIndex: indexes.indexOf(x.insertedRowIndex),
      })),
    };
  }

  return changeSet;
}

export function deleteChangeSetRows(changeSet: ChangeSet, definition: ChangeSetRowDefinition): ChangeSet {
  let [fieldName, existingItem] = findExistingChangeSetItem(changeSet, definition);
  if (fieldName == 'updates') {
    changeSet = revertChangeSetRowChanges(changeSet, definition);
    [fieldName, existingItem] = findExistingChangeSetItem(changeSet, definition);
  }
  if (fieldName == 'inserts') {
    return consolidateInsertIndexes(revertChangeSetRowChanges(changeSet, definition), definition);
  } else {
    if (existingItem && fieldName == 'deletes') return changeSet;
    return {
      ...changeSet,
      deletes: [
        ...changeSet.deletes,
        {
          pureName: definition.pureName,
          schemaName: definition.schemaName,
          condition: definition.condition,
          existingRowIndex: definition.existingRowIndex,
        },
      ],
    };
  }
}

export function getChangeSetInsertedRows(changeSet: ChangeSet, name?: NamedObjectInfo) {
  // if (!name) return [];
  if (!changeSet) return [];
  const rows = changeSet.inserts.filter(
    x => name == null || (x.pureName == name.pureName && x.schemaName == name.schemaName)
  );
  const maxIndex = _.maxBy(rows, x => x.insertedRowIndex)?.insertedRowIndex;
  if (maxIndex == null) return [];
  const res = Array(maxIndex + 1).fill({});
  for (const row of rows) {
    res[row.insertedRowIndex] = row.fields;
  }
  return res;
}

export function changeSetInsertNewRow(changeSet: ChangeSet, name?: NamedObjectInfo): ChangeSet {
  // console.log('INSERT', name);
  const insertedRows = getChangeSetInsertedRows(changeSet, name);
  return {
    ...changeSet,
    inserts: [
      ...changeSet.inserts,
      {
        ...name,
        insertedRowIndex: insertedRows.length,
        fields: {},
      },
    ],
  };
}

export function changeSetInsertDocuments(changeSet: ChangeSet, documents: any[], name?: NamedObjectInfo): ChangeSet {
  const insertedRows = getChangeSetInsertedRows(changeSet, name);
  return {
    ...changeSet,
    inserts: [
      ...changeSet.inserts,
      ...documents.map((doc, index) => ({
        ...name,
        insertedRowIndex: insertedRows.length + index,
        fields: doc,
      })),
    ],
  };
}

export function changeSetContainsChanges(changeSet: ChangeSet) {
  if (!changeSet) return false;
  return (
    changeSet.deletes.length > 0 ||
    changeSet.updates.length > 0 ||
    changeSet.inserts.length > 0 ||
    !!changeSet.structure ||
    !!changeSet.setColumnMode ||
    changeSet.dataUpdateCommands?.length > 0
  );
}
