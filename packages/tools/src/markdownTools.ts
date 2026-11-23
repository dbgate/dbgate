export function escapeMarkdownTableCell(value: string): string {
  if (value == null) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    // prevent literal HTML tags and entities from being rendered as markup
    .replace(/</g, '\\<')
    .replace(/&(?=#?\w+;)/g, '\\&')
    .replace(/\r\n|\n|\r/g, '<br>');
}

export function formatMarkdownTable(
  columns: string[],
  rows: any[],
  getCellText: (row: any, column: string) => string
): string {
  if (!columns || columns.length == 0) return '';
  const formatLine = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const lines = [
    formatLine(columns.map(col => escapeMarkdownTableCell(col))),
    formatLine(columns.map(() => '---')),
    ...(rows || []).map(row =>
      formatLine(columns.map(col => (row ? escapeMarkdownTableCell(getCellText(row, col)) : '')))
    ),
  ];
  return lines.join('\r\n');
}
