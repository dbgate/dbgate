import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { GridConfig, GridCache } from './GridConfig';
import { analyseCollectionDisplayColumns } from './CollectionGridDisplay';
import { evalFilterBehaviour } from 'dbgate-tools';
import { DatabaseInfo, EngineDriver, QueryResultColumn } from 'dbgate-types';
import {
  createEditableQueryResultMappings,
  getEditableQueryResultChangeSetField,
  getEditableQueryResultChangeSetRowDefinitions,
  isEditableQueryResultColumn,
  QueryResultColumnBaseMapping,
  QueryResultTableMapping,
} from './EditableQueryResultDisplay';

export class JslGridDisplay extends GridDisplay {
  private queryResultTableMappings: { [key: string]: QueryResultTableMapping } = {};
  private queryResultColumnBaseMappings: { [columnName: string]: QueryResultColumnBaseMapping } = {};

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
          .map(col => {
            const columnBaseMapping = this.queryResultColumnBaseMappings[col.columnName];
            return {
              columnName: col.columnName,
              headerText: col.columnName,
              uniqueName: col.columnName,
              uniquePath: [col.columnName],
              notNull: col.notNull,
              autoIncrement: col.autoIncrement,
              pureName: queryResultEditing ? (columnBaseMapping ? columnBaseMapping.pureName : col.tableName) : null,
              schemaName: queryResultEditing ? (columnBaseMapping ? columnBaseMapping.schemaName : col.tableSchema) : null,
              sourceColumnName: columnBaseMapping ? columnBaseMapping.sourceColumnName : col.sourceColumnName,
              queryResultEditable: queryResultEditableColumns.has(col.columnName),
            };
          })
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

  private getEditableQueryResultColumns(columns: QueryResultColumn[], dbinfo: DatabaseInfo) {
    const { editableColumns, tableMappings, columnBaseMappings } = createEditableQueryResultMappings(columns, dbinfo);
    this.queryResultTableMappings = tableMappings;
    this.queryResultColumnBaseMappings = columnBaseMappings;
    return editableColumns;
  }

  isColumnEditable(uniqueName: string, row?: any) {
    if (!this.queryResultEditing) return super.isColumnEditable(uniqueName, row);
    return isEditableQueryResultColumn(this.columns, this.queryResultTableMappings, uniqueName, row);
  }

  getChangeSetField(row, uniqueName, insertedRowIndex, existingRowIndex = null, baseNameOmitable = false) {
    if (!this.queryResultEditing) {
      return super.getChangeSetField(row, uniqueName, insertedRowIndex, existingRowIndex, baseNameOmitable);
    }
    return getEditableQueryResultChangeSetField(
      this.columns,
      this.queryResultTableMappings,
      row,
      uniqueName,
      insertedRowIndex,
      existingRowIndex
    );
  }

  getChangeSetRowDefinitions(row, insertedRowIndex, existingRowIndex, baseNameOmitable = false) {
    if (!this.queryResultEditing) {
      return super.getChangeSetRowDefinitions(row, insertedRowIndex, existingRowIndex, baseNameOmitable);
    }
    return getEditableQueryResultChangeSetRowDefinitions(
      this.queryResultTableMappings,
      row,
      insertedRowIndex,
      existingRowIndex
    );
  }
}
