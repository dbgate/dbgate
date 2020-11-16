/** @param columnProps {import('dbgate-types').ColumnInfo} */
function getColumnIcon(columnProps) {
  if (columnProps.autoIncrement) return 'img autoincrement';
  return 'img column';
}

/** @param columnProps {import('dbgate-types').ColumnInfo} */
export default function columnAppObject(columnProps, { setOpenedTabs }) {
  const title = columnProps.columnName;
  const key = title;
  const icon = getColumnIcon(columnProps);
  const isBold = columnProps.notNull;

  return { title, key, icon, isBold };
}
