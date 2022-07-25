export interface PerspectiveConfigColumns {
  expandedColumns: string[];
  checkedColumns: string[];
  uncheckedColumns: string[];
}

export interface PerspectiveConfig extends PerspectiveConfigColumns {
  filters: { [uniqueName: string]: string };
}

export function createPerspectiveConfig(): PerspectiveConfig {
  return {
    expandedColumns: [],
    checkedColumns: [],
    uncheckedColumns: [],
    filters: {},
  };
}

export type ChangePerspectiveConfigFunc = (
  changeFunc: (config: PerspectiveConfig) => PerspectiveConfig,
  reload?: boolean
) => void;
