import { TableInfo } from 'dbgate-types';
import uuidv1 from 'uuid/v1';

export function generateTablePairingId(table: TableInfo): TableInfo {
  if (!table) return table;
  if (!table.pairingId) {
    return {
      ...table,
      columns: table.columns.map(col => ({
        ...col,
        pairingId: col.pairingId || uuidv1(),
      })),
      pairingId: table.pairingId || uuidv1(),
    };
  }
  return table;
}
