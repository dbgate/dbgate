export function getPerspectiveParentColumnName(columnName: string) {
  const path = columnName.split('::');
  if (path.length >= 2) return path.slice(0, -1).join('::');
  return null;
}

export function getPerspectiveMostNestedChildColumnName(columnName: string) {
  const path = columnName.split('::');
  return path[path.length - 1];
}

// export function perspectiveValueMatcher(value1, value2): boolean {
//   if (value1?.$oid && value2?.$oid) return value1.$oid == value2.$oid;
//   if (Array.isArray(value1)) return !!value1.find(x => perspectiveValueMatcher(x, value2));
//   if (Array.isArray(value2)) return !!value2.find(x => perspectiveValueMatcher(value1, x));
//   return value1 == value2;
// }

export function perspectiveValueMatcher(value1, value2): boolean {
  if (value1?.$oid && value2?.$oid) return value1.$oid == value2.$oid;
  return value1 == value2;
}
