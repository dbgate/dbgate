import { DisplayColumn } from './GridDisplay';
import { TableInfo } from '@dbgate/types';

export interface GridConfig {
  hiddenColumns: string[];
  expandedColumns: string[];
  addedColumns: string[];
}

export interface GridCache {
  tables: { [uniqueName: string]: TableInfo };
  refreshTime: number;
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
    tables: {},
    refreshTime: new Date().getTime(),
  };
}
