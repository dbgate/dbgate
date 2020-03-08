import { DisplayColumn } from './GridDisplay';

export interface GridConfig {
  hiddenColumns: string[];
  expandedColumns: string[];
  addedColumns: string[];
}

export interface GridCache {
  subcolumns: { [column: string]: DisplayColumn[] };
}

export function createGridConfig(): GridConfig {
  return {
    hiddenColumns: [],
    expandedColumns: [],
    addedColumns: [],
  };
}

export function createGridCache(): GridCache {
  return {
    subcolumns: {},
  };
}
