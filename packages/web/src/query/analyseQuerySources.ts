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
          let postWord = tokens[i + 1];
          if (postWord && /^as$/i.test(postWord)) {
            postWord = tokens[i + 2];
          }
          if (!postWord) {
            res.push({
              name: word,
            });
          } else if (
            /^((where)|(inner)|(left)|(right)|(on)|(join)|(set)|(order)|(group))$/i.test(postWord) ||
            !/^[a-zA-Z][a-zA-Z0-9]*$/i.test(postWord)
          ) {
            res.push({
              name: word,
            });
          } else
            res.push({
              name: word,
              alias: postWord,
            });
        }
      }
    }
  }
  return res;
}
