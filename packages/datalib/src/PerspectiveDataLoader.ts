import { Select } from 'dbgate-sqltree';
import { PerspectiveDataLoadProps } from './PerspectiveTreeNode';

export interface PerspectiveDatabaseConfig {
  conid: string;
  database: string;
}

export class PerspectiveDataLoader {
  constructor(public apiCall, public dbg) {}

  async loadData(props: PerspectiveDataLoadProps) {
    const { schemaName, pureName, bindingColumns, bindingValues, dataColumns } = props;
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
      orderBy: dataColumns
        ? [
            {
              exprType: 'column',
              direction: 'ASC',
              columnName: dataColumns[0],
              source: {
                name: { schemaName, pureName },
              },
            },
          ]
        : null,
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

    if (this.dbg?.enabled) {
      this.dbg(`LOAD DATA, table=${props.pureName}, columns=${props.dataColumns?.join(',')}, range=${props.range}}`);
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
