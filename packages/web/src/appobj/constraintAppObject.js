/** @param props {import('@dbgate/types').ConstraintInfo} */
function getConstraintIcon(props) {
  if (props.constraintType == 'primaryKey') return 'img primary-key';
  if (props.constraintType == 'foreignKey') return 'img foreign-key';
  return null;
}

/** @param props {import('@dbgate/types').ConstraintInfo} */
export default function constraintAppObject(props, { setOpenedTabs }) {
  const title = props.constraintName;
  const key = title;
  const icon = getConstraintIcon(props);

  return { title, key, icon };
}
