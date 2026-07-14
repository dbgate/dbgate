function skipMySqlPartitionClause(tokens, index) {
  const token = tokens[index];
  if (!token || !/^partition(?:\s*\(|$)/i.test(token)) return { index, hasTrailingComma: false };

  let partitionText = token;
  let result = index + 1;
  if (/^partition$/i.test(token)) {
    if (!tokens[result]) return { index, hasTrailingComma: false };
    partitionText += tokens[result];
    result += 1;
  }

  if (!/^partition\s*\(/i.test(partitionText)) return { index, hasTrailingComma: false };

  let lastPartitionToken = partitionText;
  let depth = 0;
  for (const char of partitionText) {
    if (char == '(') depth += 1;
    if (char == ')' && depth > 0) depth -= 1;
  }

  while (depth > 0 && result < tokens.length) {
    lastPartitionToken = tokens[result];
    for (const char of tokens[result]) {
      if (char == '(') depth += 1;
      if (char == ')' && depth > 0) depth -= 1;
    }
    result += 1;
  }

  return { index: result, hasTrailingComma: /,\s*$/.test(lastPartitionToken) };
}

function parseSourceToken(token) {
  const lastWordMatch = token.match(/([^.]+)$/);
  if (!lastWordMatch) return null;
  return lastWordMatch[1].replace(/[;,]$/, '');
}

function parseAliasToken(token) {
  const aliasMatch = token?.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:[;,])?$/);
  return aliasMatch ? aliasMatch[1] : null;
}

function isSourceListContext(tokens, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const token = tokens[i].replace(/[;,]$/, '');
    if (/^((from)|(join)|(update)|(delete)|(insert))$/i.test(token)) return true;
    if (/^((select)|(where)|(on)|(set)|(order)|(group)|(having)|(limit))$/i.test(token)) return false;
  }
  return false;
}

function isSourceStart(tokens, index) {
  const preWord = tokens[index - 1];
  if (!preWord) return false;
  if (/^((join)|(from)|(update)|(delete)|(insert))$/i.test(preWord)) return true;
  return /,$/.test(preWord) && isSourceListContext(tokens, index);
}

export default function analyseQuerySources(sql, sourceNames) {
  const upperSourceNames = sourceNames.map(x => x.toUpperCase());
  const tokens = sql.split(/\s+/);
  const res = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const word = parseSourceToken(tokens[i]);
    if (word) {
      const wordUpper = word.toUpperCase();
      if (upperSourceNames.includes(wordUpper)) {
        if (isSourceStart(tokens, i)) {
          const currentTokenHasTrailingComma = /,$/.test(tokens[i]);
          const partitionClause = skipMySqlPartitionClause(tokens, i + 1);
          let postIndex = partitionClause.index;
          let postWord = tokens[postIndex];
          if (postWord && /^as$/i.test(postWord)) {
            postIndex += 1;
            postWord = tokens[postIndex];
          }
          if (!postWord || currentTokenHasTrailingComma || partitionClause.hasTrailingComma) {
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
