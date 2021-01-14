import _ from 'lodash';

export default function openReferenceForm(rowData, column, openNewTab, conid, database) {
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
