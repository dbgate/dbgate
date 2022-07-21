import { Expression, Select } from 'dbgate-sqltree';
import { PerspectiveDataLoadProps } from './PerspectiveDataProvider';
import debug from 'debug';

const dbg = debug('dbgate:PerspectiveDataLoader');

export class PerspectiveDataLoader {
  constructor(public apiCall) {}

  async loadGrouping(props: PerspectiveDataLoadProps) {
    const { schemaName, pureName, bindingColumns, bindingValues, dataColumns } = props;
    const select: Select = {
      commandType: 'select',
      from: {
        name: { schemaName, pureName },
      },
      columns: [
        {
          exprType: 'call',
          func: 'COUNT',
          args: [
            {
              exprType: 'raw',
              sql: '*',
            },
          ],
          alias: '_perspective_group_size_',
        },
        ...bindingColumns.map(
          columnName =>
            ({
              exprType: 'column',
              columnName,
              source: {
                name: { schemaName, pureName },
              },
            } as Expression)
        ),
      ],
    };
    if (bindingColumns?.length == 1) {
      select.where = {
        conditionType: 'in',
        expr: {
          exprType: 'column',
          columnName: bindingColumns[0],
          source: {
            name: { schemaName, pureName },
          },
        },
        values: bindingValues,
      };
    }

    if (dbg?.enabled) {
      dbg(`LOAD COUNTS, table=${props.pureName}, columns=${props.dataColumns?.join(',')}`);
    }

    const response = await this.apiCall('database-connections/sql-select', {
      conid: props.databaseConfig.conid,
      database: props.databaseConfig.database,
      select,
    });

    if (response.errorMessage) return response;
    return response.rows;
  }

  async loadData(props: PerspectiveDataLoadProps) {
    const { schemaName, pureName, bindingColumns, bindingValues, dataColumns, orderBy } = props;
    const select: Select = {
      commandType: 'select',
      from: {
        name: { schemaName, pureName },
      },
      columns: dataColumns?.map(columnName => ({
        exprType: 'column',
        columnName,
        source: {
          name: { schemaName, pureName },
        },
      })),
      selectAll: !dataColumns,
      orderBy: dataColumns?.map(columnName => ({
        exprType: 'column',
        columnName,
        direction: 'ASC',
        source: {
          name: { schemaName, pureName },
        },
      })),
      range: props.range,
    };
    if (bindingColumns?.length == 1) {
      select.where = {
        conditionType: 'in',
        expr: {
          exprType: 'column',
          columnName: bindingColumns[0],
          source: {
            name: { schemaName, pureName },
          },
        },
        values: bindingValues,
      };
    }

    if (dbg?.enabled) {
      dbg(`LOAD DATA, table=${props.pureName}, columns=${props.dataColumns?.join(',')}, range=${props.range}}`);
    }

    const response = await this.apiCall('database-connections/sql-select', {
      conid: props.databaseConfig.conid,
      database: props.databaseConfig.database,
      select,
    });

    if (response.errorMessage) return response;
    return response.rows;
  }
}
