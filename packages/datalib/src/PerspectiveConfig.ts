export interface PerspectiveConfig {
  expandedColumns: string[];
  checkedColumns: string[];
  uncheckedColumns: string[];
}

export function createPerspectiveConfig(): PerspectiveConfig {
  return {
    expandedColumns: [],
    checkedColumns: [],
    uncheckedColumns: [],
  };
}

export type ChangePerspectiveConfigFunc = (changeFunc: (config: PerspectiveConfig) => PerspectiveConfig) => void;
