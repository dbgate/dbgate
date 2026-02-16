export function parseGraphQlSelectionPaths(text: string): { fieldPaths: string[]; argumentPaths: string[] } {
  if (!text) return { fieldPaths: [], argumentPaths: [] };
  const cleaned = text.replace(/#[^\n]*/g, '').replace(/"([^"\\]|\\.)*"/g, '""');

  const tokens: string[] = cleaned.match(/\.\.\.|[A-Za-z_][A-Za-z0-9_]*|\$[A-Za-z_][A-Za-z0-9_]*|[@{}()!:$]/g) || [];
  const startIndex = tokens.indexOf('{');
  if (startIndex === -1) return { fieldPaths: [], argumentPaths: [] };

  const result = parseSelectionSet(tokens, startIndex, []);
  return {
    fieldPaths: result.fieldPaths.map(parts => parts.join('.')),
    argumentPaths: result.argumentPaths.map(parts => parts.join('.')),
  };
}

function parseArgumentsFromField(tokens: string[], startIndex: number): { arguments: string[]; endIndex: number } {
  const args: string[] = [];
  let index = startIndex;

  if (tokens[index] !== '(') {
    return { arguments: args, endIndex: index };
  }

  let depth = 1;
  index += 1;
  while (index < tokens.length && depth > 0) {
    if (tokens[index] === '(') depth += 1;
    if (tokens[index] === ')') depth -= 1;

    // Look for argument names (identifier followed by colon)
    if (depth > 0 && /^[A-Za-z_]/.test(tokens[index]) && tokens[index + 1] === ':') {
      args.push(tokens[index]);
      index += 2;
    } else {
      index += 1;
    }
  }

  return { arguments: args, endIndex: index };
}

function parseSelectionSet(
  tokens: string[],
  startIndex: number,
  prefix: string[]
): { fieldPaths: string[][]; argumentPaths: string[][]; index: number } {
  const fieldPaths: string[][] = [];
  const argumentPaths: string[][] = [];
  let index = startIndex + 1;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token === '}') {
      return { fieldPaths, argumentPaths, index: index + 1 };
    }

    if (token === '...') {
      index += 1;
      if (tokens[index] === 'on') {
        index += 2;
      }
      while (index < tokens.length && tokens[index] !== '{' && tokens[index] !== '}') {
        index += 1;
      }
      if (tokens[index] === '{') {
        const frag = parseSelectionSet(tokens, index, prefix);
        fieldPaths.push(...frag.fieldPaths);
        argumentPaths.push(...frag.argumentPaths);
        index = frag.index;
        continue;
      }
      continue;
    }

    if (/^[A-Za-z_]/.test(token)) {
      let fieldName = token;
      if (tokens[index + 1] === ':' && /^[A-Za-z_]/.test(tokens[index + 2] || '')) {
        fieldName = tokens[index + 2];
        index += 3;
      } else {
        index += 1;
      }

      // Parse arguments if present
      const { arguments: args, endIndex: argsEndIndex } = parseArgumentsFromField(tokens, index);
      index = argsEndIndex;

      // Add argument paths for this field
      for (const arg of args) {
        argumentPaths.push([...prefix, fieldName, arg]);
      }

      while (tokens[index] === '@') {
        index += 2;
        if (tokens[index] === '(') {
          let depth = 1;
          index += 1;
          while (index < tokens.length && depth > 0) {
            if (tokens[index] === '(') depth += 1;
            if (tokens[index] === ')') depth -= 1;
            index += 1;
          }
        }
      }

      if (tokens[index] === '{') {
        const nested = parseSelectionSet(tokens, index, [...prefix, fieldName]);
        if (nested.fieldPaths.length > 0) {
          fieldPaths.push(...nested.fieldPaths);
        } else {
          fieldPaths.push([...prefix, fieldName]);
        }
        argumentPaths.push(...nested.argumentPaths);
        index = nested.index;
      } else {
        fieldPaths.push([...prefix, fieldName]);
      }
      continue;
    }

    index += 1;
  }

  return { fieldPaths, argumentPaths, index };
}
