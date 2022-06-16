export interface PerspectiveConfig {
  hiddenColumns: string[];
  shownColumns: string[];
  expandedColumns: string[];
  collapsedColumns: string[];
}

export function createPerspectiveConfig(): PerspectiveConfig {
  return {
    hiddenColumns: [],
    shownColumns: [],
    expandedColumns: [],
    collapsedColumns: [],
  };
}

export type ChangePerspectiveConfigFunc = (changeFunc: (config: PerspectiveConfig) => PerspectiveConfig) => void;
