import _ from 'lodash';
import type { QueryResultColumn } from 'dbgate-types';
import { ChangeSet, createChangeSet } from './ChangeSet';

export function createQueryResultSaveChangeSet(changeSet: ChangeSet, structure: { columns?: QueryResultColumn[] }) {
  const res = createChangeSet();
  const columnMap = _.keyBy(
    (structure?.columns || []).filter(column => column.tableName && column.sourceColumnName),
    'columnName'
  );

  res.updates = (changeSet?.updates || [])
    .map(update => {
      const fields = {};
      for (const fieldName of Object.keys(update.fields || {})) {
        const column = columnMap[fieldName];
        if (!column) continue;
        fields[column.sourceColumnName] = update.fields[fieldName];
      }
      if (_.isEmpty(fields)) return null;
      return {
        pureName: update.pureName,
        schemaName: update.schemaName,
        condition: update.condition,
        fields,
      };
    })
    .filter(Boolean);

  return res;
}
