export interface PerspectiveConfigColumns {
  expandedColumns: string[];
  checkedColumns: string[];
  uncheckedColumns: string[];
}

export interface PerspectiveConfig extends PerspectiveConfigColumns {
  filters: { [uniqueName: string]: string };
  sort: {
    [parentUniqueName: string]: {
      uniqueName: string;
      order: 'ASC' | 'DESC';
    }[];
  };
}

export function createPerspectiveConfig(): PerspectiveConfig {
  return {
    expandedColumns: [],
    checkedColumns: [],
    uncheckedColumns: [],
    filters: {},
    sort: {},
  };
}

export type ChangePerspectiveConfigFunc = (
  changeFunc: (config: PerspectiveConfig) => PerspectiveConfig,
  reload?: boolean
) => void;
