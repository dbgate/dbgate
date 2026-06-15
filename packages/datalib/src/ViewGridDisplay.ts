import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import type { EngineDriver, ViewInfo, ColumnInfo, DatabaseInfo, QueryResultColumn } from 'dbgate-types';
import { GridConfig, GridCache } from './GridConfig';
import {
  createEditableQueryResultMappings,
  getEditableQueryResultChangeSetField,
  getEditableQueryResultChangeSetRowDefinitions,
  isEditableQueryResultColumn,
  QueryResultColumnBaseMapping,
  QueryResultTableMapping,
} from './EditableQueryResultDisplay';

export class ViewGridDisplay extends GridDisplay {
  private queryResultTableMappings: { [key: string]: QueryResultTableMapping } = {};
  private queryResultColumnBaseMappings: { [columnName: string]: QueryResultColumnBaseMapping } = {};

  constructor(
    public view: ViewInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    dbinfo: DatabaseInfo,
    serverVersion,
    currentSettings,
    public viewResultInfo: { columns?: QueryResultColumn[] } = null,
    editableView = false
  ) {
    super(config, setConfig, cache, setCache, driver, dbinfo, serverVersion, currentSettings);
    const effectiveEditable =
      editableView && driver?.databaseEngineTypes?.includes('sql') && driver?.supportsEditableQueryResults;
    const queryResultEditableColumns = effectiveEditable
      ? this.getEditableQueryResultColumns(viewResultInfo?.columns || [], dbinfo)
      : new Set<string>();
    const resultColumnMap = _.keyBy(viewResultInfo?.columns || [], 'columnName');
    this.columns = this.getDisplayColumns(view, resultColumnMap, queryResultEditableColumns);
    this.formColumns = this.columns;
    this.filterable = true;
    this.sortable = true;
    this.groupable = false;
    this.editable = effectiveEditable && this.columns.some(col => col.queryResultEditable);
    if (effectiveEditable) {
      this.allowInsert = false;
      this.allowDelete = false;
      this.allowStructureChange = false;
      this.allowRowDocumentEdit = false;
    }
    this.supportsReload = true;
    this.baseView = view;
  }

  private getEditableQueryResultColumns(columns: QueryResultColumn[], dbinfo: DatabaseInfo) {
    const { editableColumns, tableMappings, columnBaseMappings } = createEditableQueryResultMappings(columns, dbinfo);
    this.queryResultTableMappings = tableMappings;
    this.queryResultColumnBaseMappings = columnBaseMappings;
    return editableColumns;
  }

  getDisplayColumns(
    view: ViewInfo,
    resultColumnMap: { [columnName: string]: QueryResultColumn } = {},
    queryResultEditableColumns = new Set<string>()
  ) {
    return (
      view?.columns
        ?.map(col => this.getDisplayColumn(view, col, resultColumnMap[col.columnName], queryResultEditableColumns))
        ?.map(col => ({
          ...col,
          isChecked: this.isColumnChecked(col),
        })) || []
    );
  }

  getDisplayColumn(
    view: ViewInfo,
    col: ColumnInfo,
    resultColumn: QueryResultColumn = null,
    queryResultEditableColumns = new Set<string>()
  ) {
    const uniquePath = [col.columnName];
    const uniqueName = uniquePath.join('.');
    const columnBaseMapping = this.queryResultColumnBaseMappings[col.columnName];
    return {
      ...col,
      pureName: columnBaseMapping?.pureName || resultColumn?.tableName || view.pureName,
      schemaName: columnBaseMapping?.schemaName || resultColumn?.tableSchema || view.schemaName,
      headerText: col.columnName,
      uniqueName,
      uniquePath,
      sourceColumnName: columnBaseMapping?.sourceColumnName || resultColumn?.sourceColumnName,
      queryResultEditable: queryResultEditableColumns.has(col.columnName),
    };
  }

  isColumnEditable(uniqueName: string, row?: any) {
    if (!this.editable) return false;
    return isEditableQueryResultColumn(this.columns, this.queryResultTableMappings, uniqueName, row);
  }

  getChangeSetField(row, uniqueName, insertedRowIndex, existingRowIndex = null, baseNameOmitable = false) {
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
    return getEditableQueryResultChangeSetRowDefinitions(
      this.queryResultTableMappings,
      row,
      insertedRowIndex,
      existingRowIndex
    );
  }

  createSelect(options = {}) {
    const select = this.createSelectBase(this.view, this.view.columns, options);
    return select;
  }
}
