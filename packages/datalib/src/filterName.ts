export function filterName(filter: string, name: string) {
  if (!filter) return true;
  if (!name) return false;
  return name.toUpperCase().includes(filter.toUpperCase());
}
