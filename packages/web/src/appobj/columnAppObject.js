import { ColumnIcon, SequenceIcon } from '../icons';

/** @param columnProps {import('@dbgate/types').ColumnInfo} */
function getColumnIcon(columnProps) {
  if (columnProps.autoIncrement) return SequenceIcon;
  return ColumnIcon;
}

/** @param columnProps {import('@dbgate/types').ColumnInfo} */
export default function columnAppObject(columnProps, { setOpenedTabs }) {
  const title = columnProps.columnName;
  const key = title;
  const Icon = getColumnIcon(columnProps);
  const isBold = columnProps.notNull;

  return { title, key, Icon, isBold };
}
