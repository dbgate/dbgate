export function getPerspectiveParentColumnName(columnName: string) {
  const path = columnName.split('::');
  if (path.length >= 2) return path.slice(0, -1).join('::');
  return null;
}

export function getPerspectiveMostNestedChildColumnName(columnName: string) {
  const path = columnName.split('::');
  return path[path.length - 1];
}
