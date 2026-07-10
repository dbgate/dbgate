function skipMySqlPartitionClause(tokens, index) {
  const token = tokens[index];
  if (!token || !/^partition(?:\s*\(|$)/i.test(token)) return index;

  let partitionText = token;
  let result = index + 1;
  if (/^partition$/i.test(token)) {
    if (!tokens[result]) return index;
    partitionText += tokens[result];
    result += 1;
  }

  if (!/^partition\s*\(/i.test(partitionText)) return index;

  let depth = 0;
  for (const char of partitionText) {
    if (char == '(') depth += 1;
    if (char == ')' && depth > 0) depth -= 1;
  }

  while (depth > 0 && result < tokens.length) {
    for (const char of tokens[result]) {
      if (char == '(') depth += 1;
      if (char == ')' && depth > 0) depth -= 1;
    }
    result += 1;
  }

  return result;
}

function parseAliasToken(token) {
  const aliasMatch = token?.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:[;,])?$/);
  return aliasMatch ? aliasMatch[1] : null;
}

export default function analyseQuerySources(sql, sourceNames) {
  const upperSourceNames = sourceNames.map(x => x.toUpperCase());
  const tokens = sql.split(/\s+/);
  const res = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const lastWordMatch = tokens[i].match(/([^.]+)$/);
    if (lastWordMatch) {
      const word = lastWordMatch[1];
      const wordUpper = word.toUpperCase();
      if (upperSourceNames.includes(wordUpper)) {
        const preWord = tokens[i - 1];
        if (preWord && /^((join)|(from)|(update)|(delete)|(insert))$/i.test(preWord)) {
          let postIndex = skipMySqlPartitionClause(tokens, i + 1);
          let postWord = tokens[postIndex];
          if (postWord && /^as$/i.test(postWord)) {
            postIndex += 1;
            postWord = tokens[postIndex];
          }
          if (!postWord) {
            res.push({
              name: word,
            });
          } else if (/^((where)|(inner)|(left)|(right)|(on)|(join)|(set)|(order)|(group))$/i.test(postWord)) {
            res.push({
              name: word,
            });
          } else {
            const alias = parseAliasToken(postWord);
            if (!alias) {
              res.push({
                name: word,
              });
            } else
              res.push({
                name: word,
                alias,
              });
          }
        }
      }
    }
  }
  return res;
}
