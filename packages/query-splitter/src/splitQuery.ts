import { SplitterOptions, defaultSplitterOptions } from './options';

const SEMICOLON = ';';

export interface SplitStreamContext {
  options: SplitterOptions;
  currentDelimiter: string;
  pushOutput: (item: SplitResultItem) => void;
  commandPart: string;

  line: number;
  column: number;
  streamPosition: number;

  commandStartPosition: number;
  commandStartLine: number;
  commandStartColumn: number;
}

export interface SplitLineContext extends SplitStreamContext {
  source: string;
  position: number;
  // output: string[];
  end: number;
  wasDataOnLine: boolean;
  currentCommandStart: number;

  //   unread: string;
  //   currentStatement: string;
  //   semicolonKeyTokenRegex: RegExp;
}

export interface SplitPositionDefinition {
  position: number;
  line: number;
  column: number;
}

export interface SplitResultItemRich {
  text: string;
  start: SplitPositionDefinition;
  end: SplitPositionDefinition;
  trimStart?: SplitPositionDefinition;
  trimEnd?: SplitPositionDefinition;
}

export type SplitResultItem = string | SplitResultItemRich;

function movePosition(context: SplitLineContext, count: number) {
  if (context.options.returnRichInfo) {
    let { source, position, line, column, streamPosition } = context;
    while (count > 0) {
      if (source[position] == '\n') {
        line += 1;
        column = 0;
      } else {
        column += 1;
      }
      position += 1;
      streamPosition += 1;
      count -= 1;
    }
    context.position = position;
    context.streamPosition = streamPosition;
    context.line = line;
    context.column = column;
  } else {
    context.position += count;
  }
}

function isStringEnd(s: string, pos: number, endch: string, escapech: string) {
  if (!escapech) {
    return s[pos] == endch;
  }
  if (endch == escapech) {
    return s[pos] == endch && s[pos + 1] != endch;
  } else {
    return s[pos] == endch && s[pos - 1] != escapech;
  }
}

interface Token {
  type: 'string' | 'delimiter' | 'whitespace' | 'eoln' | 'data' | 'set_delimiter' | 'comment' | 'go_delimiter';
  length: number;
  value?: string;
}

const WHITESPACE_TOKEN: Token = {
  type: 'whitespace',
  length: 1,
};
const EOLN_TOKEN: Token = {
  type: 'eoln',
  length: 1,
};
const DATA_TOKEN: Token = {
  type: 'data',
  length: 1,
};

function scanDollarQuotedString(context: SplitLineContext): Token {
  if (!context.options.allowDollarDollarString) return null;

  let pos = context.position;
  const s = context.source;

  const match = /^(\$[a-zA-Z0-9_]*\$)/.exec(s.slice(pos));
  if (!match) return null;
  const label = match[1];
  pos += label.length;

  while (pos < context.end) {
    if (s.slice(pos).startsWith(label)) {
      return {
        type: 'string',
        length: pos + label.length - context.position,
      };
    }
    pos++;
  }

  return null;
}

function scanToken(context: SplitLineContext): Token {
  let pos = context.position;
  const s = context.source;
  const ch = s[pos];

  if (context.options.stringsBegins.includes(ch)) {
    pos++;
    const endch = context.options.stringsEnds[ch];
    const escapech = context.options.stringEscapes[ch];
    while (pos < context.end && !isStringEnd(s, pos, endch, escapech)) {
      if (endch == escapech && s[pos] == endch && s[pos + 1] == endch) {
        pos += 2;
      } else {
        pos++;
      }
    }
    return {
      type: 'string',
      length: pos - context.position + 1,
    };
  }

  if (context.currentDelimiter && s.slice(pos).startsWith(context.currentDelimiter)) {
    return {
      type: 'delimiter',
      length: context.currentDelimiter.length,
    };
  }

  if (ch == ' ' || ch == '\t' || ch == '\r') {
    return WHITESPACE_TOKEN;
  }

  if (ch == '\n') {
    return EOLN_TOKEN;
  }

  if (context.options.doubleDashComments && ch == '-' && s[pos + 1] == '-') {
    while (pos < context.end && s[pos] != '\n') pos++;
    return {
      type: 'comment',
      length: pos - context.position,
    };
  }

  if (context.options.multilineComments && ch == '/' && s[pos + 1] == '*') {
    pos += 2;
    while (pos < context.end) {
      if (s[pos] == '*' && s[pos + 1] == '/') break;
      pos++;
    }
    return {
      type: 'comment',
      length: pos - context.position + 2,
    };
  }

  if (context.options.allowCustomDelimiter && !context.wasDataOnLine) {
    const m = s.slice(pos).match(/^DELIMITER[ \t]+([^\n]+)/i);
    if (m) {
      return {
        type: 'set_delimiter',
        value: m[1].trim(),
        length: m[0].length,
      };
    }
  }

  if (context.options.allowGoDelimiter && !context.wasDataOnLine) {
    const m = s.slice(pos).match(/^GO[\t\r ]*(\n|$)/i);
    if (m) {
      return {
        type: 'go_delimiter',
        length: m[0].length - 1,
      };
    }
  }

  const dollarString = scanDollarQuotedString(context);
  if (dollarString) return dollarString;

  return DATA_TOKEN;
}

function pushQuery(context: SplitLineContext) {
  const sql = (context.commandPart || '') + context.source.slice(context.currentCommandStart, context.position);
  const trimmed = sql.trim();
  if (trimmed) {
    if (context.options.returnRichInfo) {
      context.pushOutput(
        countTrimmedPositions(sql, {
          text: trimmed,

          start: {
            position: context.commandStartPosition,
            line: context.commandStartLine,
            column: context.commandStartColumn,
          },

          end: {
            position: context.streamPosition,
            line: context.line,
            column: context.column,
          },
        })
      );
    } else {
      context.pushOutput(trimmed);
    }
  }
}

function countTrimmedPositions(full: string, positions: SplitResultItemRich): SplitResultItemRich {
  const startIndex = full.indexOf(positions.text);

  const trimStart = { ...positions.start };
  for (let i = 0; i < startIndex; i += 1) {
    if (full[i] == '\n') {
      trimStart.position += 1;
      trimStart.line += 1;
      trimStart.column = 0;
    } else {
      trimStart.position += 1;
      trimStart.column += 1;
    }
  }

  return {
    ...positions,
    trimStart,
    trimEnd: positions.end,
  };
}

function markStartCommand(context: SplitLineContext) {
  if (context.options.returnRichInfo) {
    context.commandStartPosition = context.streamPosition;
    context.commandStartLine = context.line;
    context.commandStartColumn = context.column;
  }
}

function splitByLines(context: SplitLineContext) {
  while (context.position < context.end) {
    if (context.source[context.position] == '\n') {
      pushQuery(context);
      context.commandPart = '';
      movePosition(context, 1);
      context.currentCommandStart = context.position;
      markStartCommand(context);
    } else {
      movePosition(context, 1);
    }
  }

  if (context.end > context.currentCommandStart) {
    context.commandPart += context.source.slice(context.currentCommandStart, context.position);
  }
}

export function splitQueryLine(context: SplitLineContext) {
  if (context.options.splitByLines) {
    splitByLines(context);
    return;
  }

  while (context.position < context.end) {
    const token = scanToken(context);
    if (!token) {
      // nothing special, move forward
      movePosition(context, 1);
      continue;
    }
    switch (token.type) {
      case 'string':
        movePosition(context, token.length);
        context.wasDataOnLine = true;
        break;
      case 'comment':
        movePosition(context, token.length);
        context.wasDataOnLine = true;
        break;
      case 'eoln':
        movePosition(context, token.length);
        context.wasDataOnLine = false;
        break;
      case 'data':
        movePosition(context, token.length);
        context.wasDataOnLine = true;
        break;
      case 'whitespace':
        movePosition(context, token.length);
        break;
      case 'set_delimiter':
        pushQuery(context);
        context.commandPart = '';
        context.currentDelimiter = token.value;
        movePosition(context, token.length);
        context.currentCommandStart = context.position;
        markStartCommand(context);
        break;
      case 'go_delimiter':
        pushQuery(context);
        context.commandPart = '';
        movePosition(context, token.length);
        context.currentCommandStart = context.position;
        markStartCommand(context);
        break;
      case 'delimiter':
        pushQuery(context);
        context.commandPart = '';
        movePosition(context, token.length);
        context.currentCommandStart = context.position;
        markStartCommand(context);
        break;
    }
  }

  if (context.end > context.currentCommandStart) {
    context.commandPart += context.source.slice(context.currentCommandStart, context.position);
  }
}

export function getInitialDelimiter(options: SplitterOptions) {
  return options?.allowSemicolon === false ? null : SEMICOLON;
}

export function finishSplitStream(context: SplitStreamContext) {
  const trimmed = context.commandPart.trim();
  if (trimmed) {
    if (context.options.returnRichInfo) {
      context.pushOutput(
        countTrimmedPositions(context.commandPart, {
          text: trimmed,

          start: {
            position: context.commandStartPosition,
            line: context.commandStartLine,
            column: context.commandStartColumn,
          },

          end: {
            position: context.streamPosition,
            line: context.line,
            column: context.column,
          },
        })
      );
    } else {
      context.pushOutput(trimmed);
    }
  }
}

export function splitQuery(sql: string, options: SplitterOptions = null): SplitResultItem[] {
  const usedOptions = {
    ...defaultSplitterOptions,
    ...options,
  };

  if (usedOptions.noSplit) {
    if (usedOptions.returnRichInfo) {
      const lines = sql.split('\n');
      return [
        {
          text: sql,
          start: {
            position: 0,
            line: 0,
            column: 0,
          },
          end: {
            position: sql.length,
            line: lines.length,
            column: lines[lines.length - 1]?.length || 0,
          },
        },
      ];
    }
    return [sql];
  }

  const output = [];
  const context: SplitLineContext = {
    source: sql,
    end: sql.length,
    currentDelimiter: getInitialDelimiter(options),
    position: 0,
    column: 0,
    line: 0,
    currentCommandStart: 0,
    commandStartLine: 0,
    commandStartColumn: 0,
    commandStartPosition: 0,
    streamPosition: 0,
    pushOutput: cmd => output.push(cmd),
    wasDataOnLine: false,
    options: usedOptions,
    commandPart: '',
  };

  splitQueryLine(context);
  finishSplitStream(context);

  return output;
}
