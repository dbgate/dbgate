import _ from 'lodash';

export interface ChangeSetItem {
  pureName: string;
  schemaName: string;
  insertedRowIndex?: number;
  condition?: { [column: string]: string };
  fields?: { [column: string]: string };
}

export interface ChangeSet {
  inserts: ChangeSetItem[];
  updates: ChangeSetItem[];
  deletes: ChangeSetItem[];
}

export function createChangeSet(): ChangeSet {
  return {
    inserts: [],
    updates: [],
    deletes: [],
  };
}

export interface ChangeSetFieldDefinition {
  pureName: string;
  schemaName: string;
  uniqueName: string;
  columnName: string;
  insertedRowIndex?: number;
  condition?: { [column: string]: string };
}

function findExistingChangeSetItem(
  changeSet: ChangeSet,
  definition: ChangeSetFieldDefinition
): [keyof ChangeSet, ChangeSetItem] {
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
    return [
      'updates',
      changeSet.updates.find(
        x =>
          x.pureName == definition.pureName &&
          x.schemaName == definition.schemaName &&
          _.isEqual(x.condition, definition.condition)
      ),
    ];
  }
}

export function setChangeSetValue(
  changeSet: ChangeSet,
  definition: ChangeSetFieldDefinition,
  value: string
): ChangeSet {
  const [fieldName, existingItem] = findExistingChangeSetItem(changeSet, definition);
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
        fields: {
          [definition.uniqueName]: value,
        },
      },
    ],
  };
}
