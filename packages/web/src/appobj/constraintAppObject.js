import { PrimaryKeyIcon, ForeignKeyIcon } from '../icons';

/** @param props {import('@dbgate/types').ConstraintInfo} */
function getConstraintIcon(props) {
  if (props.constraintType == 'primaryKey') return PrimaryKeyIcon;
  if (props.constraintType == 'foreignKey') return ForeignKeyIcon;
  return null;
}

/** @param props {import('@dbgate/types').ConstraintInfo} */
export default function constraintAppObject(props, { setOpenedTabs }) {
  const title = props.constraintName;
  const key = title;
  const Icon = getConstraintIcon(props);

  return { title, key, Icon };
}
