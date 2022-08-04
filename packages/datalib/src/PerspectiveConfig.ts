export interface PerspectiveConfigColumns {
  expandedColumns: string[];
  checkedColumns: string[];
  uncheckedColumns: string[];
}

export interface PerspectiveCustomJoinConfig {
  joinid: string;
  joinName: string;
  baseUniqueName: string;
  conid?: string;
  database?: string;
  refSchemaName?: string;
  refTableName: string;
  columns: {
    baseColumnName: string;
    refColumnName: string;
  }[];
}

export interface PerspectiveFilterColumnInfo {
  columnName: string;
  filterType: string;
}
export interface PerspectiveConfig extends PerspectiveConfigColumns {
  filters: { [uniqueName: string]: string };
  filterInfos: { [uniqueName: string]: PerspectiveFilterColumnInfo };
  sort: {
    [parentUniqueName: string]: {
      uniqueName: string;
      order: 'ASC' | 'DESC';
    }[];
  };
  customJoins: PerspectiveCustomJoinConfig[];
}

export function createPerspectiveConfig(): PerspectiveConfig {
  return {
    expandedColumns: [],
    checkedColumns: [],
    uncheckedColumns: [],
    customJoins: [],
    filters: {},
    filterInfos: {},
    sort: {},
  };
}

export type ChangePerspectiveConfigFunc = (
  changeFunc: (config: PerspectiveConfig) => PerspectiveConfig,
  reload?: boolean
) => void;
