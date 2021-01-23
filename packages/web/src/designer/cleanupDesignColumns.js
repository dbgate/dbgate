export default function cleanupDesignColumns(columns) {
  return (columns || []).filter(
    x => x.isOutput || x.isGrouped || x.alias || (x.aggregate && x.aggregate != '---') || x.sortOrder || x.filter
  );
}
