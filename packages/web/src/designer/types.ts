import { JoinType } from 'dbgate-sqltree';
import { TableInfo } from 'dbgate-types';

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
  filter: string;
};

export type DesignerInfo = {
  tables: DesignerTableInfo[];
  columns: DesignerColumnInfo[];
  references: DesignerReferenceInfo[];
};

// export type DesignerComponent = {
//   tables: DesignerTableInfo[];
// };
