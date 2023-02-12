import _ from 'lodash';
import { Command, Insert, Update, Delete, UpdateField, Condition, AllowIdentityInsert } from 'dbgate-sqltree';
import type { NamedObjectInfo, DatabaseInfo, ForeignKeyInfo, TableInfo } from 'dbgate-types';
import { ChangeSet, ChangeSetItem, extractChangeSetCondition } from './ChangeSet';

export interface ChangeSetDeleteCascade {
  title: string;
  commands: Command[];
}

// function getDeleteScript()

function processDependencies(
  changeSet: ChangeSet,
  result: ChangeSetDeleteCascade[],
  allForeignKeys: ForeignKeyInfo[],
  fkPath: ForeignKeyInfo[],
  table: TableInfo,
  baseCmd: ChangeSetItem,
  dbinfo: DatabaseInfo,
  usedTables: string[]
) {
  if (result.find(x => x.title == table.pureName)) return;

  const dependencies = allForeignKeys.filter(
    x => x.refSchemaName == table.schemaName && x.refTableName == table.pureName
  );

  for (const fk of dependencies) {
    const depTable = dbinfo.tables.find(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName);
    const subFkPath = [...fkPath, fk];
    if (depTable && !usedTables.includes(depTable.pureName)) {
      processDependencies(changeSet, result, allForeignKeys, subFkPath, depTable, baseCmd, dbinfo, [
        ...usedTables,
        depTable.pureName,
      ]);
    }

    const refCmd: Delete = {
      commandType: 'delete',
      from: {
        name: {
          pureName: fk.pureName,
          schemaName: fk.schemaName,
        },
      },
      where: {
        conditionType: 'exists',
        subQuery: {
          commandType: 'select',
          selectAll: true,
          from: {
            name: {
              pureName: fk.pureName,
              schemaName: fk.schemaName,
            },
            alias: 't0',
            relations: [...subFkPath].reverse().map((fkItem, fkIndex) => ({
              joinType: 'INNER JOIN',
              alias: `t${fkIndex + 1}`,
              name: {
                pureName: fkItem.refTableName,
                schemaName: fkItem.refSchemaName,
              },
              conditions: fkItem.columns.map(column => ({
                conditionType: 'binary',
                operator: '=',
                left: {
                  exprType: 'column',
                  columnName: column.columnName,
                  source: { alias: `t${fkIndex}` },
                },
                right: {
                  exprType: 'column',
                  columnName: column.refColumnName,
                  source: { alias: `t${fkIndex + 1}` },
                },
              })),
            })),
          },
          where: {
            conditionType: 'and',
            conditions: [
              extractChangeSetCondition(baseCmd, `t${subFkPath.length}`),
              // @ts-ignore
              ...table.primaryKey.columns.map(column => ({
                conditionType: 'binary',
                operator: '=',
                left: {
                  exprType: 'column',
                  columnName: column.columnName,
                  source: { alias: 't0' },
                },
                right: {
                  exprType: 'column',
                  columnName: column.columnName,
                  source: {
                    name: fk,
                  },
                },
              })),
            ],
          },
        },
      },
    };
    let resItem = result.find(x => x.title == fk.pureName);
    if (!resItem) {
      resItem = {
        title: fk.pureName,
        commands: [],
      };
      result.push(resItem);
    }
    resItem.commands.push(refCmd);
  }
}

export function getDeleteCascades(changeSet: ChangeSet, dbinfo: DatabaseInfo): ChangeSetDeleteCascade[] {
  const result: ChangeSetDeleteCascade[] = [];
  const allForeignKeys = _.flatten(dbinfo.tables.map(x => x.foreignKeys));
  for (const baseCmd of changeSet.deletes) {
    const table = dbinfo.tables.find(x => x.pureName == baseCmd.pureName && x.schemaName == baseCmd.schemaName);
    if (!table.primaryKey) continue;

    const itemResult: ChangeSetDeleteCascade[] = [];
    processDependencies(changeSet, itemResult, allForeignKeys, [], table, baseCmd, dbinfo, [table.pureName]);
    for (const item of itemResult) {
      const existing = result.find(x => x.title == item.title);
      if (existing) {
        existing.commands.push(...item.commands);
      } else {
        result.push(item);
      }
    }

    // let resItem = result.find(x => x.title == baseCmd.pureName);
    // if (!resItem) {
    //   resItem = {
    //     title: baseCmd.pureName,
    //     commands: [],
    //   };
    //   result.push(resItem);
    // }
    // resItem.commands.push(changeSetDeleteToSql(baseCmd));
  }

  return result;
}
