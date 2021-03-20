import _ from 'lodash';
import openNewTab from '../utility/openNewTab';

export default function openReferenceForm(rowData, column, conid, database) {
  const formViewKey = _.fromPairs(
    column.foreignKey.columns.map(({ refColumnName, columnName }) => [refColumnName, rowData[columnName]])
  );
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
        formViewKey,
      },
    },
    {
      forceNewTab: true,
    }
  );
}
