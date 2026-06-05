import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { GridConfig, GridCache } from './GridConfig';
import { analyseCollectionDisplayColumns } from './CollectionGridDisplay';
import { evalFilterBehaviour } from 'dbgate-tools';
import { DatabaseInfo, EngineDriver, QueryResultColumn, TableInfo } from 'dbgate-types';

interface QueryResultTableMapping {
  pureName: string;
  schemaName?: string;
  keyColumns: string[];
  keyDisplayColumns: { displayName: string; sourceColumnName: string }[];
}

export class JslGridDisplay extends GridDisplay {
  private queryResultTableMappings: { [key: string]: QueryResultTableMapping } = {};

  constructor(
    jslid,
    structure,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    rows: any,
    isDynamicStructure: boolean,
    supportsReload: boolean,
    editable: boolean = false,
    driver: EngineDriver = null,
    currentSettings = null,
    public queryResultEditing = false,
    dbinfo: DatabaseInfo = null
  ) {
    super(config, setConfig, cache, setCache, driver, dbinfo, undefined, currentSettings);

    this.filterable = true;
    this.sortable = true;
    this.supportsReload = supportsReload;
    this.isDynamicStructure = isDynamicStructure;
    this.filterBehaviourOverride = evalFilterBehaviour;
    this.editable = editable;
    this.editableStructure = editable && !queryResultEditing ? structure : null;
    if (queryResultEditing) {
      this.allowInsert = false;
      this.allowDelete = false;
      this.allowStructureChange = false;
      this.allowRowDocumentEdit = false;
    }

    if (structure?.columns) {
      const queryResultEditableColumns = queryResultEditing
        ? this.getEditableQueryResultColumns(structure.columns, dbinfo)
        : new Set();
      this.columns = _.uniqBy(
        structure.columns
          .map(col => ({
            columnName: col.columnName,
            headerText: col.columnName,
            uniqueName: col.columnName,
            uniquePath: [col.columnName],
            notNull: col.notNull,
            autoIncrement: col.autoIncrement,
            pureName: queryResultEditing ? col.tableName : null,
            schemaName: queryResultEditing ? col.tableSchema : null,
            sourceColumnName: col.sourceColumnName,
            queryResultEditable: queryResultEditableColumns.has(col.columnName),
          }))
          ?.map(col => ({
            ...col,
            isChecked: this.isColumnChecked(col),
          })),
        col => col.uniqueName
      );
    }

    if (structure?.__isDynamicStructure) {
      this.columns = analyseCollectionDisplayColumns(rows, this);
    }

    if (!this.columns) this.columns = [];

    if (queryResultEditing) {
      this.editable = this.columns.some(col => col.queryResultEditable);
    }

    this.formColumns = this.columns;
  }

  private getTableKey(schemaName: string, pureName: string) {
    return `${schemaName || ''}\n${pureName}`;
  }

  private findTable(dbinfo: DatabaseInfo, schemaName: string, pureName: string): TableInfo {
    if (!dbinfo?.tables) return null;
    if (schemaName) {
      return dbinfo.tables.find(table => table.schemaName == schemaName && table.pureName == pureName);
    }
    const tables = dbinfo.tables.filter(table => table.pureName == pureName);
    return tables.length == 1 ? tables[0] : null;
  }

  private getEditableQueryResultColumns(columns: QueryResultColumn[], dbinfo: DatabaseInfo) {
    const res = new Set<string>();
    const groups = _.groupBy(
      columns.filter(column => column.tableName && column.sourceColumnName),
      column => this.getTableKey(column.tableSchema, column.tableName)
    );

    for (const groupColumns of Object.values(groups)) {
      const firstColumn = groupColumns[0];
      const table = this.findTable(dbinfo, firstColumn.tableSchema, firstColumn.tableName);
      const sourceToDisplay = new Map(groupColumns.map(column => [column.sourceColumnName, column.columnName]));
      const primaryKeyColumns =
        table?.primaryKey?.columns?.map(column => column.columnName) ||
        groupColumns.filter(column => column.isPrimaryKey).map(column => column.sourceColumnName);
      const keyColumns =
        primaryKeyColumns.length > 0 && primaryKeyColumns.every(columnName => sourceToDisplay.has(columnName))
          ? primaryKeyColumns
          : [];
      if (keyColumns.length == 0) continue;

      const mapping = {
        pureName: firstColumn.tableName,
        schemaName: firstColumn.tableSchema,
        keyColumns,
        keyDisplayColumns: keyColumns.map(sourceColumnName => ({
          sourceColumnName,
          displayName: sourceToDisplay.get(sourceColumnName),
        })),
      };
      this.queryResultTableMappings[this.getTableKey(firstColumn.tableSchema, firstColumn.tableName)] = mapping;

      for (const column of groupColumns) {
        res.add(column.columnName);
      }
    }
    return res;
  }

  private hasCompleteQueryResultKey(mapping: QueryResultTableMapping, row: any) {
    return mapping.keyDisplayColumns.every(keyColumn => {
      const value = row?.[keyColumn.displayName];
      return value !== null && value !== undefined;
    });
  }

  isColumnEditable(uniqueName: string, row?: any) {
    if (!this.queryResultEditing) return super.isColumnEditable(uniqueName, row);
    const col = this.columns.find(column => column.uniqueName == uniqueName);
    if (!col?.queryResultEditable) return false;
    const mapping = this.queryResultTableMappings[this.getTableKey(col.schemaName, col.pureName)];
    return !!mapping && this.hasCompleteQueryResultKey(mapping, row);
  }

  getChangeSetField(row, uniqueName, insertedRowIndex, existingRowIndex = null, baseNameOmitable = false) {
    if (!this.queryResultEditing) {
      return super.getChangeSetField(row, uniqueName, insertedRowIndex, existingRowIndex, baseNameOmitable);
    }
    if (insertedRowIndex != null || !this.isColumnEditable(uniqueName, row)) return null;
    const col = this.columns.find(column => column.uniqueName == uniqueName);
    if (!col) return null;
    const mapping = this.queryResultTableMappings[this.getTableKey(col.schemaName, col.pureName)];
    if (!mapping) return null;
    if (!this.hasCompleteQueryResultKey(mapping, row)) return null;
    const condition = {};
    for (const keyColumn of mapping.keyDisplayColumns) {
      condition[keyColumn.sourceColumnName] = row?.[keyColumn.displayName];
    }
    if (_.isEmpty(condition)) return null;
    return {
      pureName: mapping.pureName,
      schemaName: mapping.schemaName,
      existingRowIndex,
      condition,
      uniqueName,
      columnName: col.sourceColumnName,
    };
  }

  getChangeSetRowDefinitions(row, insertedRowIndex, existingRowIndex, baseNameOmitable = false) {
    if (!this.queryResultEditing) {
      return super.getChangeSetRowDefinitions(row, insertedRowIndex, existingRowIndex, baseNameOmitable);
    }
    if (insertedRowIndex != null) return [];
    return Object.values(this.queryResultTableMappings)
      .filter(mapping => this.hasCompleteQueryResultKey(mapping, row))
      .map(mapping => {
        const condition = {};
        for (const keyColumn of mapping.keyDisplayColumns) {
          condition[keyColumn.sourceColumnName] = row?.[keyColumn.displayName];
        }
        return {
          pureName: mapping.pureName,
          schemaName: mapping.schemaName,
          existingRowIndex,
          condition,
        };
      });
  }
}
