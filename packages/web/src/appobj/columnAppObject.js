/** @param columnProps {import('@dbgate/types').ColumnInfo} */
function getColumnIcon(columnProps) {
  if (columnProps.autoIncrement) return 'mdi mdi-numeric-1-box-multiple-outline';
  return 'mdi mdi-table-column';
}

/** @param columnProps {import('@dbgate/types').ColumnInfo} */
export default function columnAppObject(columnProps, { setOpenedTabs }) {
  const title = columnProps.columnName;
  const key = title;
  const icon = getColumnIcon(columnProps);
  const isBold = columnProps.notNull;

  return { title, key, icon, isBold };
}
