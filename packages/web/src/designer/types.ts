import type { JoinType } from 'dbgate-sqltree';
import type { TableInfo } from 'dbgate-types';

export type DesignerTableInfo = TableInfo & {
  designerId: string;
  alias?: string;
  left: number;
  top: number;
};

export type DesignerJoinType = JoinType | 'WHERE EXISTS' | 'WHERE NOT EXISTS';

export type DesignerReferenceInfo = {
  designerId: string;
  joinType: DesignerJoinType;
  sourceId: string;
  targetId: string;
  columns: {
    source: string;
    target: string;
  }[];
};

export type DesignerColumnInfo = {
  designerId: string;
  columnName: string;
  alias?: string;
  isGrouped?: boolean;
  aggregate?: string;
  isOutput?: boolean;
  sortOrder?: number;
  filter?: string;
  groupFilter?: string;
  isCustomExpression?: boolean;
  customExpression?: string;
};

export type DesignerSettings = {
  isDistinct?: boolean;
  additionalFilterCount?: number;
  additionalGroupFilterCount?: number;
};

export type DesignerInfo = {
  settings?: DesignerSettings;
  tables: DesignerTableInfo[];
  columns: DesignerColumnInfo[];
  references: DesignerReferenceInfo[];
};

// export type DesignerComponent = {
//   tables: DesignerTableInfo[];
// };
