import { DisplayColumn } from './GridDisplay';

export interface GridConfig {
  hiddenColumns: string[];
  expandedColumns: string[];
}

export interface GridCache {
  subcolumns: { [column: string]: DisplayColumn[] };
}

export function createGridConfig(): GridConfig {
  return {
    hiddenColumns: [],
    expandedColumns: [],
  };
}

export function createGridCache(): GridCache {
  return {
    subcolumns: {},
  };
}
