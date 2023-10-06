import type { TableInfo } from 'dbgate-types';

export interface FreeTableModel {
  structure: TableInfo;
  rows: any[];
}

export function createFreeTableModel() {
  return {
    structure: {
      columns: [
        {
          columnName: 'col1',
        },
      ],
      foreignKeys: [],
    },
    rows: [
      {
        col1: 'val1',
      },
      {
        col1: 'val2',
      },
    ],
  };
}
