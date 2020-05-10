export function getFilterValueExpression(value) {
  if (value == null) return 'NULL';
  return `="${value}"`;
}
