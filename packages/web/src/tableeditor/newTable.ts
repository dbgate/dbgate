import _ from 'lodash';
import openNewTab from '../utility/openNewTab';
import { findEngineDriver, getConnectionLabel } from 'dbgate-tools';
import { getAppliedCurrentSchema, getExtensions } from '../stores';

export default function newTable(connection, database) {
  const tooltip = `${getConnectionLabel(connection)}\n${database}`;
  const driver = findEngineDriver(connection, getExtensions());
  openNewTab(
    {
      title: 'Table #',
      tooltip,
      icon: 'img table-structure',
      tabComponent: 'TableStructureTab',
      props: {
        conid: connection._id,
        database,
      },
    },
    {
      editor: {
        current: {
          pureName: 'new_table',
          schemaName: getAppliedCurrentSchema() ?? driver?.dialect?.defaultSchemaName,
          columns: driver.dialect?.defaultNewTableColumns ?? [
            {
              columnName: 'id',
              dataType: 'int',
              notNull: true,
              autoIncrement: true,
            },
          ],
          primaryKey: {
            constraintType: 'primaryKey',
            columns: [
              {
                columnName: 'id',
              },
            ],
          },
        },
      },
    },
    {
      forceNewTab: true,
    }
  );
}
