export function parseGraphQlSelectionPaths(text: string): {
  fieldPaths: string[];
  argumentPaths: string[];
  argumentValues: Record<string, Record<string, string>>;
} {
  if (!text) return { fieldPaths: [], argumentPaths: [], argumentValues: {} };
  const cleaned = text.replace(/#[^\n]*/g, '');

  const tokens: string[] =
    cleaned.match(
      /\.\.\.|"(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_]*|\$[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[@{}()\[\],!:$]/g
    ) || [];
  const startIndex = tokens.indexOf('{');
  if (startIndex === -1) return { fieldPaths: [], argumentPaths: [], argumentValues: {} };

  const result = parseSelectionSet(tokens, startIndex, []);
  return {
    fieldPaths: result.fieldPaths.map(parts => parts.join('.')),
    argumentPaths: result.argumentPaths.map(parts => parts.join('.')),
    argumentValues: result.argumentValues,
  };
}

function parseArgumentValue(tokens: string[], startIndex: number): { value: string; endIndex: number } {
  const valueTokens: string[] = [];
  let index = startIndex;
  let parenthesesDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (token === '(') {
      parenthesesDepth += 1;
      valueTokens.push(token);
      index += 1;
      continue;
    }

    if (token === '[') {
      bracketDepth += 1;
      valueTokens.push(token);
      index += 1;
      continue;
    }

    if (token === '{') {
      braceDepth += 1;
      valueTokens.push(token);
      index += 1;
      continue;
    }

    if (token === ')') {
      if (parenthesesDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        break;
      }
      parenthesesDepth -= 1;
      valueTokens.push(token);
      index += 1;
      continue;
    }

    if (token === ']') {
      if (bracketDepth === 0) break;
      bracketDepth -= 1;
      valueTokens.push(token);
      index += 1;
      continue;
    }

    if (token === '}') {
      if (braceDepth === 0) break;
      braceDepth -= 1;
      valueTokens.push(token);
      index += 1;
      continue;
    }

    if (token === ',' && parenthesesDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      break;
    }

    valueTokens.push(token);
    index += 1;
  }

  return {
    value: valueTokens.join(''),
    endIndex: index,
  };
}

function parseArgumentsFromField(
  tokens: string[],
  startIndex: number
): { arguments: { name: string; value: string }[]; endIndex: number } {
  const args: { name: string; value: string }[] = [];
  let index = startIndex;

  if (tokens[index] !== '(') {
    return { arguments: args, endIndex: index };
  }

  let depth = 1;
  index += 1;
  while (index < tokens.length && depth > 0) {
    if (tokens[index] === '(') depth += 1;
    if (tokens[index] === ')') depth -= 1;

    // Look for argument names (identifier followed by colon) and their values
    if (depth > 0 && /^[A-Za-z_]/.test(tokens[index]) && tokens[index + 1] === ':') {
      const argumentName = tokens[index];
      const { value, endIndex } = parseArgumentValue(tokens, index + 2);
      args.push({ name: argumentName, value });
      index = endIndex;
      if (tokens[index] === ',') {
        index += 1;
      }
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
): {
  fieldPaths: string[][];
  argumentPaths: string[][];
  argumentValues: Record<string, Record<string, string>>;
  index: number;
} {
  const fieldPaths: string[][] = [];
  const argumentPaths: string[][] = [];
  const argumentValues: Record<string, Record<string, string>> = {};
  let index = startIndex + 1;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token === '}') {
      return { fieldPaths, argumentPaths, argumentValues, index: index + 1 };
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
        for (const [fieldPath, values] of Object.entries(frag.argumentValues)) {
          argumentValues[fieldPath] = {
            ...(argumentValues[fieldPath] || {}),
            ...values,
          };
        }
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
      const currentFieldPath = [...prefix, fieldName].join('.');
      for (const arg of args) {
        argumentPaths.push([...prefix, fieldName, arg.name]);
        if (!argumentValues[currentFieldPath]) {
          argumentValues[currentFieldPath] = {};
        }
        argumentValues[currentFieldPath][arg.name] = arg.value;
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
        for (const [fieldPath, values] of Object.entries(nested.argumentValues)) {
          argumentValues[fieldPath] = {
            ...(argumentValues[fieldPath] || {}),
            ...values,
          };
        }
        index = nested.index;
      } else {
        fieldPaths.push([...prefix, fieldName]);
      }
      continue;
    }

    index += 1;
  }

  return { fieldPaths, argumentPaths, argumentValues, index };
}
