// this algoruthm is implemented by ChatGPT o3

function sliceColumnList(ddl) {
  // ① jump to the first “(” that follows the ON <table> qualifier
  const onMatch = /ON\s+(?:"[^"]+"|\w+)(?:\s*\.\s*(?:"[^"]+"|\w+))*\s*\(/i.exec(ddl);
  if (!onMatch) return '';
  const start = onMatch.index + onMatch[0].length - 1; // points at the "("

  // ② walk forward until depth returns to 0
  let depth = 0,
    i = start,
    end = -1;
  while (i < ddl.length) {
    const ch = ddl[i++];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        end = i - 1;
        break;
      }
    }
  }
  return end === -1 ? '' : ddl.slice(start + 1, end); // inside the ()
}

function splitTopLevel(list) {
  const parts = [];
  let depth = 0,
    last = 0;
  for (let i = 0; i <= list.length; i++) {
    const ch = list[i] ?? ','; // virtual comma at the end
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(list.slice(last, i).trim());
      last = i + 1;
    }
  }
  return parts.filter(Boolean);
}

function clean(segment) {
  return (
    segment
      // drop ASC|DESC, NULLS FIRST|LAST
      .replace(/\bASC\b|\bDESC\b|\bNULLS\s+(FIRST|LAST)\b/gi, '')
      // un-wrap one-liner functions:  LOWER(col) -> col
      .replace(/^[A-Za-z_][\w$]*\(\s*([^()]+?)\s*\)$/i, '$1')
      // chop any schema- or table- prefix:  tbl.col -> col
      .replace(/^.*\.(?=[^.)]+$)/, '')
      // strip double-quotes
      .replace(/"/g, '')
      .trim()
  );
}

function extractIndexColumns(sql) {
  if (!sql) return [];
  const sqlText = sql // your variable
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/--.*?$/gm, '') // strip line comments
    .trim();

  const list = sliceColumnList(sqlText);
  if (!list) return [];
  return splitTopLevel(list).map(clean);
}

module.exports = extractIndexColumns;
