import { Condition, Expression, Select } from 'dbgate-sqltree';
import { PerspectiveDataLoadProps } from './PerspectiveDataProvider';
import debug from 'debug';

const dbg = debug('dbgate:PerspectiveDataLoader');

export class PerspectiveDataLoader {
  constructor(public apiCall) {}

  buildCondition(props: PerspectiveDataLoadProps): Condition {
    const { schemaName, pureName, bindingColumns, bindingValues, dataColumns, orderBy, condition } = props;

    const conditions = [];

    if (condition) {
      conditions.push(condition);
    }

    if (bindingColumns?.length == 1) {
      conditions.push({
        conditionType: 'in',
        expr: {
          exprType: 'column',
          columnName: bindingColumns[0],
          source: {
            name: { schemaName, pureName },
          },
        },
        values: bindingValues.map(x => x[0]),
      });
    }

    return conditions.length > 0
      ? {
          conditionType: 'and',
          conditions,
        }
      : null;
  }

  async loadGrouping(props: PerspectiveDataLoadProps) {
    const { schemaName, pureName, bindingColumns, bindingValues, dataColumns } = props;

    const bindingColumnExpressions = bindingColumns.map(
      columnName =>
        ({
          exprType: 'column',
          columnName,
          source: {
            name: { schemaName, pureName },
          },
        } as Expression)
    );

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
        ...bindingColumnExpressions,
      ],
      where: this.buildCondition(props),
    };

    select.groupBy = bindingColumnExpressions;

    if (dbg?.enabled) {
      dbg(`LOAD COUNTS, table=${props.pureName}, columns=${props.dataColumns?.join(',')}`);
    }

    const response = await this.apiCall('database-connections/sql-select', {
      conid: props.databaseConfig.conid,
      database: props.databaseConfig.database,
      select,
    });

    if (response.errorMessage) return response;
    return response.rows.map(row => ({
      ...row,
      _perspective_group_size_: parseInt(row._perspective_group_size_),
    }));
  }

  async loadData(props: PerspectiveDataLoadProps) {
    const { schemaName, pureName, bindingColumns, bindingValues, dataColumns, orderBy, condition } = props;

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
      orderBy: orderBy?.map(columnName => ({
        exprType: 'column',
        columnName,
        direction: 'ASC',
        source: {
          name: { schemaName, pureName },
        },
      })),
      range: props.range,
      where: this.buildCondition(props),
    };

    if (dbg?.enabled) {
      dbg(
        `LOAD DATA, table=${props.pureName}, columns=${props.dataColumns?.join(',')}, range=${props.range?.offset},${
          props.range?.limit
        }`
      );
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
