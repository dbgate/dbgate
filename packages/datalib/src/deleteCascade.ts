import _ from 'lodash';
import { Command, Insert, Update, Delete, UpdateField, Condition, AllowIdentityInsert } from 'dbgate-sqltree';
import { NamedObjectInfo, DatabaseInfo } from 'dbgate-types';
import { ChangeSet, extractChangeSetCondition, changeSetDeleteToSql } from './ChangeSet';

export interface ChangeSetDeleteCascade {
  title: string;
  commands: Command[];
}

export function getDeleteCascades(changeSet: ChangeSet, dbinfo: DatabaseInfo): ChangeSetDeleteCascade[] {
  const res: ChangeSetDeleteCascade[] = [];
  const allForeignKeys = _.flatten(dbinfo.tables.map(x => x.foreignKeys));
  for (const baseCmd of changeSet.deletes) {
    const table = dbinfo.tables.find(x => x.pureName == baseCmd.pureName && x.schemaName == baseCmd.schemaName);
    if (!table.primaryKey) continue;
    const dependencies = allForeignKeys.filter(
      x => x.refSchemaName == table.schemaName && x.refTableName == table.pureName
    );
    for (const fk of dependencies) {
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
            from: {
              name: {
                pureName: fk.pureName,
                schemaName: fk.schemaName,
              },
              alias: 't1',
              relations: [
                {
                  joinType: 'INNER JOIN',
                  alias: 't2',
                  name: {
                    pureName: fk.refTableName,
                    schemaName: fk.refSchemaName,
                  },
                  conditions: fk.columns.map(column => ({
                    conditionType: 'binary',
                    operator: '=',
                    left: {
                      exprType: 'column',
                      columnName: column.columnName,
                      source: { alias: 't1' },
                    },
                    right: {
                      exprType: 'column',
                      columnName: column.refColumnName,
                      source: { alias: 't2' },
                    },
                  })),
                },
              ],
            },
            where: {
              conditionType: 'and',
              conditions: [
                extractChangeSetCondition(baseCmd, 't2'),
                // @ts-ignore
                ...table.primaryKey.columns.map(column => ({
                  conditionType: 'binary',
                  operator: '=',
                  left: {
                    exprType: 'column',
                    columnName: column.columnName,
                    source: { alias: 't1' },
                  },
                  right: {
                    exprType: 'column',
                    columnName: column.columnName,
                    source: {
                      name: {
                        pureName: fk.refTableName,
                        schemaName: fk.refSchemaName,
                      },
                    },
                  },
                })),
              ],
            },
          },
        },
      };
      let resItem = res.find(x => x.title == fk.pureName);
      if (!resItem) {
        resItem = {
          title: fk.pureName,
          commands: [],
        };
        res.push(resItem);
      }
      resItem.commands.push(refCmd);
    }

    let resItem = res.find(x => x.title == baseCmd.pureName);
    if (!resItem) {
      resItem = {
        title: baseCmd.pureName,
        commands: [],
      };
      res.push(resItem);
    }

    resItem.commands.push(changeSetDeleteToSql(baseCmd));
  }

  return res;
}
