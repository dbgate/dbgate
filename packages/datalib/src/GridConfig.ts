import { DisplayColumn } from './GridDisplay';
import { TableInfo } from '@dbgate/types';

export interface GridConfigColumns {
  hiddenColumns: string[];
  expandedColumns: string[];
  addedColumns: string[];
}

export interface GridReferenceDefinition {
  schemaName: string;
  pureName: string;
  columns: {
    baseName: string;
    refName: string;
  }[];
}

export interface GridConfig extends GridConfigColumns {
  filters: { [uniqueName: string]: string };
  focusedColumn?: string;
  columnWidths: { [uniqueName: string]: number };
  sort: {
    uniqueName: string;
    order: 'ASC' | 'DESC';
  }[];
}

export interface GridCache {
  tables: { [uniqueName: string]: TableInfo };
  loadingTables: { schemaName: string; pureName: string }[];
  refreshTime: number;
}

export function createGridConfig(): GridConfig {
  return {
    hiddenColumns: [],
    expandedColumns: [],
    addedColumns: [],
    filters: {},
    columnWidths: {},
    sort: [],
    focusedColumn: null,
  };
}

export function createGridCache(): GridCache {
  return {
    tables: {},
    loadingTables: [],
    refreshTime: new Date().getTime(),
  };
}
