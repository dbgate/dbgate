function goSplit(sql) {
  if (!sql) return [];
  const lines = sql.split('\n');
  const res = [];
  let buffer = '';
  for (const line of lines) {
    if (/^\s*go\s*$/i.test(line)) {
      if (buffer.trim()) res.push(buffer);
      buffer = '';
    } else {
      buffer += line + '\n';
    }
  }
  if (buffer.trim()) res.push(buffer);
  return res;
}

module.exports = goSplit;
