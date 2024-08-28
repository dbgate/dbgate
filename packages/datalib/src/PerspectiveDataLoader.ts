import { Condition, Expression, Select } from 'dbgate-sqltree';
import { PerspectiveDataLoadProps } from './PerspectiveDataProvider';
import debug from 'debug';
import _zipObject from 'lodash/zipObject';
import _mapValues from 'lodash/mapValues';
import _isArray from 'lodash/isArray';
import { safeJsonParse } from 'dbgate-tools';
import { CollectionAggregateDefinition } from 'dbgate-types';

function normalizeLoadedRow(row) {
  return _mapValues(row, v => safeJsonParse(v) || v);
}

function normalizeResult(result) {
  if (_isArray(result)) {
    return result.map(normalizeLoadedRow);
  }
  if (result.errorMessage) {
    return result;
  }
  return {
    ...result,
    errorMessage: 'Unspecified error',
  };
}

const dbg = debug('dbgate:PerspectiveDataLoader');

export class PerspectiveDataLoader {
  constructor(public apiCall) {}

  buildSqlCondition(props: PerspectiveDataLoadProps): Condition {
    const { schemaName, pureName, bindingColumns, bindingValues, dataColumns, orderBy, sqlCondition } = props;

    const conditions = [];

    if (sqlCondition) {
      conditions.push(sqlCondition);
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

  async loadGroupingSqlDb(props: PerspectiveDataLoadProps) {
    const { schemaName, pureName, bindingColumns } = props;

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
      where: this.buildSqlCondition(props),
    };

    select.groupBy = bindingColumnExpressions;

    if (dbg?.enabled) {
      dbg(`LOAD COUNTS, table=${props.pureName}, columns=${bindingColumns?.join(',')}`);
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

  async loadGroupingDocDb(props: PerspectiveDataLoadProps) {
    const { schemaName, pureName, bindingColumns } = props;

    const aggregate: CollectionAggregateDefinition = {
      condition: this.buildSqlCondition(props),
      groupByColumns: bindingColumns,
      aggregateColumns: [
        {
          alias: 'pergrpsize',
          aggregateFunction: 'count',
        },
      ],
    };
    // const aggregate = [
    //   { $match: this.buildMongoCondition(props) },
    //   {
    //     $group: {
    //       _id: _zipObject(
    //         bindingColumns,
    //         bindingColumns.map(col => '$' + col)
    //       ),
    //       count: { $sum: 1 },
    //     },
    //   },
    // ];

    if (dbg?.enabled) {
      dbg(`LOAD COUNTS, table=${props.pureName}, columns=${bindingColumns?.join(',')}`);
    }

    const response = await this.apiCall('database-connections/collection-data', {
      conid: props.databaseConfig.conid,
      database: props.databaseConfig.database,
      options: {
        pureName,
        aggregate,
      },
    });

    if (response.errorMessage) return response;
    return response.rows.map(row => ({
      ...row,
      _perspective_group_size_: parseInt(row.pergrpsize),
    }));
  }

  async loadGrouping(props: PerspectiveDataLoadProps) {
    const { engineType } = props;
    switch (engineType) {
      case 'sqldb':
        return this.loadGroupingSqlDb(props);
      case 'docdb':
        return this.loadGroupingDocDb(props);
    }
  }

  async loadDataSqlDb(props: PerspectiveDataLoadProps) {
    const {
      schemaName,
      pureName,
      bindingColumns,
      bindingValues,
      dataColumns,
      orderBy,
      sqlCondition: condition,
      engineType,
    } = props;

    if (dataColumns?.length == 0) {
      return [];
    }

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
      orderBy:
        orderBy?.length > 0
          ? orderBy?.map(({ columnName, order }) => ({
              exprType: 'column',
              columnName,
              direction: order,
              source: {
                name: { schemaName, pureName },
              },
            }))
          : null,
      range: props.range,
      where: this.buildSqlCondition(props),
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

  getDocDbLoadOptions(props: PerspectiveDataLoadProps, useSort: boolean) {
    const { pureName } = props;
    const res: any = {
      pureName,
      condition: this.buildSqlCondition(props),
      sort:
        useSort && props.orderBy?.length > 0
          ? props.orderBy.map(x => ({
              ...x,
              direction: x.order,
            }))
          : undefined,
      skip: props.range?.offset,
      limit: props.range?.limit,
    };
    // if (useSort && props.orderBy?.length > 0) {
    //   res.sort = _zipObject(
    //     props.orderBy.map(col => col.columnName),
    //     props.orderBy.map(col => (col.order == 'DESC' ? -1 : 1))
    //   );
    // }

    return res;
  }

  async loadDataDocDb(props: PerspectiveDataLoadProps) {
    const {
      schemaName,
      pureName,
      bindingColumns,
      bindingValues,
      dataColumns,
      orderBy,
      sqlCondition: condition,
      engineType,
    } = props;

    if (dbg?.enabled) {
      dbg(
        `LOAD DATA, collection=${props.pureName}, columns=${props.dataColumns?.join(',')}, range=${
          props.range?.offset
        },${props.range?.limit}`
      );
    }

    const options = this.getDocDbLoadOptions(props, true);

    const response = await this.apiCall('database-connections/collection-data', {
      conid: props.databaseConfig.conid,
      database: props.databaseConfig.database,
      options,
    });

    if (response.errorMessage) return response;
    return response.rows;
  }

  async loadData(props: PerspectiveDataLoadProps) {
    const { engineType } = props;
    switch (engineType) {
      case 'sqldb':
        return normalizeResult(await this.loadDataSqlDb(props));
      case 'docdb':
        return normalizeResult(await this.loadDataDocDb(props));
    }
  }

  async loadRowCountSqlDb(props: PerspectiveDataLoadProps) {
    const {
      schemaName,
      pureName,
      bindingColumns,
      bindingValues,
      dataColumns,
      orderBy,
      sqlCondition: condition,
    } = props;

    const select: Select = {
      commandType: 'select',
      from: {
        name: { schemaName, pureName },
      },
      columns: [
        {
          exprType: 'raw',
          sql: 'COUNT(*)',
          alias: 'count',
        },
      ],
      where: this.buildSqlCondition(props),
    };

    const response = await this.apiCall('database-connections/sql-select', {
      conid: props.databaseConfig.conid,
      database: props.databaseConfig.database,
      select,
    });

    if (response.errorMessage) return response;
    return response.rows[0];
  }

  async loadRowCountDocDb(props: PerspectiveDataLoadProps) {
    const {
      schemaName,
      pureName,
      bindingColumns,
      bindingValues,
      dataColumns,
      orderBy,
      sqlCondition: condition,
    } = props;

    const options = {
      ...this.getDocDbLoadOptions(props, false),
      countDocuments: true,
    };

    const response = await this.apiCall('database-connections/collection-data', {
      conid: props.databaseConfig.conid,
      database: props.databaseConfig.database,
      options,
    });

    return response;
  }

  async loadRowCount(props: PerspectiveDataLoadProps) {
    const { engineType } = props;
    switch (engineType) {
      case 'sqldb':
        return this.loadRowCountSqlDb(props);
      case 'docdb':
        return this.loadRowCountDocDb(props);
    }
  }
}
