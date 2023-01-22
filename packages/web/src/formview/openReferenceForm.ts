import { getFilterValueExpression } from 'dbgate-filterparser';
import _ from 'lodash';
import openNewTab from '../utility/openNewTab';

export default function openReferenceForm(rowData, column, conid, database) {
  openNewTab(
    {
      title: column.foreignKey.refTableName,
      icon: 'img table',
      tabComponent: 'TableDataTab',
      props: {
        schemaName: column.foreignKey.refSchemaName,
        pureName: column.foreignKey.refTableName,
        conid,
        database,
        objectTypeField: 'tables',
      },
    },
    {
      grid: {
        isFormView: true,
        filters: {
          [column.foreignKey.columns[0].refColumnName]: getFilterValueExpression(
            rowData[column.foreignKey.columns[0].columnName],
            'string'
          ),
        },
      },
    },
    {
      forceNewTab: true,
    }
  );
}

export function openPrimaryKeyForm(rowData, baseTable, conid, database) {
  const formViewKey = _.fromPairs(
    baseTable.primaryKey.columns.map(({ columnName }) => [columnName, rowData[columnName]])
  );
  openNewTab(
    {
      title: baseTable.pureName,
      icon: 'img table',
      tabComponent: 'TableDataTab',
      props: {
        schemaName: baseTable.schemaName,
        pureName: baseTable.pureName,
        conid,
        database,
        objectTypeField: 'tables',
      },
    },
    {
      grid: {
        isFormView: true,
        filters: {
          [baseTable.primaryKey.columns[0].columnName]: getFilterValueExpression(
            rowData[baseTable.primaryKey.columns[0].columnName],
            'string'
          ),
        },

        formViewKey,
      },
    },
    {
      forceNewTab: true,
    }
  );
}
