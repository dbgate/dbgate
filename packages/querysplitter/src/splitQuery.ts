const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';
const DOUBLE_DASH_COMMENT_START = '--';
const HASH_COMMENT_START = '#';
const C_STYLE_COMMENT_START = '/*';
const SEMICOLON = ';';
const LINE_FEED = '\n';
const DELIMITER_KEYWORD = 'DELIMITER';

export interface SplitQueryOptions {}

interface SplitExecutionContext {
  options: SplitQueryOptions;
  unread: string;
  currentDelimiter: string;
  currentStatement: string;
  output: string[];
}

interface FindExpResult {
  expIndex: number;
  exp: string | null;
  nextIndex: number;
}

const regexEscapeSetRegex = /[-/\\^$*+?.()|[\]{}]/g;
const singleQuoteStringEndRegex = /(?<!\\)'/;
const doubleQuoteStringEndRegex = /(?<!\\)"/;
const backtickQuoteEndRegex = /(?<!`)`(?!`)/;
const doubleDashCommentStartRegex = /--[ \f\n\r\t\v]/;
const cStyleCommentStartRegex = /\/\*/;
const cStyleCommentEndRegex = /(?<!\/)\*\//;
const newLineRegex = /(?:[\r\n]+|$)/;
const delimiterStartRegex = /(?:^|[\n\r]+)[ \f\t\v]*DELIMITER[ \t]+/i;
// Best effort only, unable to find a syntax specification on delimiter
const delimiterTokenRegex = /^(?:'(.+)'|"(.+)"|`(.+)`|([^\s]+))/;
const semicolonKeyTokenRegex = buildKeyTokenRegex(SEMICOLON);
const quoteEndRegexDict: Record<string, RegExp> = {
  [SINGLE_QUOTE]: singleQuoteStringEndRegex,
  [DOUBLE_QUOTE]: doubleQuoteStringEndRegex,
  [BACKTICK]: backtickQuoteEndRegex,
};

function escapeRegex(value: string): string {
  return value.replace(regexEscapeSetRegex, '\\$&');
}

function buildKeyTokenRegex(delimiter: string): RegExp {
  return new RegExp(
    '(?:' +
      [
        escapeRegex(delimiter),
        SINGLE_QUOTE,
        DOUBLE_QUOTE,
        BACKTICK,
        doubleDashCommentStartRegex.source,
        HASH_COMMENT_START,
        cStyleCommentStartRegex.source,
        delimiterStartRegex.source,
      ].join('|') +
      ')',
    'i'
  );
}

function findExp(content: string, regex: RegExp): FindExpResult {
  const match = content.match(regex);
  let result: FindExpResult;
  if (match?.index !== undefined) {
    result = {
      expIndex: match.index,
      exp: match[0],
      nextIndex: match.index + match[0].length,
    };
  } else {
    result = {
      expIndex: -1,
      exp: null,
      nextIndex: content.length,
    };
  }
  return result;
}

function findKeyToken(content: string, currentDelimiter: string): FindExpResult {
  let regex;
  if (currentDelimiter === SEMICOLON) {
    regex = semicolonKeyTokenRegex;
  } else {
    regex = buildKeyTokenRegex(currentDelimiter);
  }
  return findExp(content, regex);
}

function findEndQuote(content: string, quote: string): FindExpResult {
  if (!(quote in quoteEndRegexDict)) {
    throw new TypeError(`Incorrect quote ${quote} supplied`);
  }
  return findExp(content, quoteEndRegexDict[quote]);
}

function read(context: SplitExecutionContext, readToIndex: number, nextUnreadIndex?: number): void {
  const readContent = context.unread.slice(0, readToIndex);
  context.currentStatement += readContent;
  if (nextUnreadIndex !== undefined && nextUnreadIndex > 0) {
    context.unread = context.unread.slice(nextUnreadIndex);
  } else {
    context.unread = context.unread.slice(readToIndex);
  }
}

function readTillNewLine(context: SplitExecutionContext): void {
  const findResult = findExp(context.unread, newLineRegex);
  read(context, findResult.expIndex, findResult.expIndex);
}

function discard(context: SplitExecutionContext, nextUnreadIndex: number): void {
  if (nextUnreadIndex > 0) {
    context.unread = context.unread.slice(nextUnreadIndex);
  }
}

function discardTillNewLine(context: SplitExecutionContext): void {
  const findResult = findExp(context.unread, newLineRegex);
  discard(context, findResult.expIndex);
}

function publishStatement(context: SplitExecutionContext): void {
  const trimmed = context.currentStatement.trim();
  if (trimmed) {
    context.output.push(trimmed);
  }
  context.currentStatement = '';
}

function handleKeyTokenFindResult(context: SplitExecutionContext, findResult: FindExpResult): void {
  switch (findResult.exp?.trim()) {
    case context.currentDelimiter:
      read(context, findResult.expIndex, findResult.nextIndex);
      publishStatement(context);
      break;
    case SINGLE_QUOTE:
    case DOUBLE_QUOTE:
    case BACKTICK: {
      read(context, findResult.nextIndex);
      const findQuoteResult = findEndQuote(context.unread, findResult.exp);
      read(context, findQuoteResult.nextIndex, undefined);
      break;
    }
    case DOUBLE_DASH_COMMENT_START: {
      read(context, findResult.nextIndex);
      readTillNewLine(context);
      break;
    }
    case HASH_COMMENT_START: {
      read(context, findResult.nextIndex);
      readTillNewLine(context);
      break;
    }
    case C_STYLE_COMMENT_START: {
      read(context, findResult.nextIndex);
      const findCommentResult = findExp(context.unread, cStyleCommentEndRegex);
      read(context, findCommentResult.nextIndex);
      break;
    }
    case DELIMITER_KEYWORD: {
      read(context, findResult.expIndex, findResult.nextIndex);
      // MySQL client will return `DELIMITER cannot contain a backslash character` if backslash is used
      // Shall we reject backslash as well?
      const matched = context.unread.match(delimiterTokenRegex);
      if (matched?.index !== undefined) {
        context.currentDelimiter = matched[0].trim();
        discard(context, matched[0].length);
      }
      discardTillNewLine(context);
      break;
    }
    case undefined:
    case null:
      read(context, findResult.nextIndex);
      publishStatement(context);
      break;
    default:
      // This should never happen
      throw new Error(`Unknown token '${findResult.exp ?? '(null)'}'`);
  }
}

export function splitQuery(sql: string, options: SplitQueryOptions = {}): string[] {
  const context: SplitExecutionContext = {
    unread: sql,
    currentDelimiter: SEMICOLON,
    currentStatement: '',
    output: [],
    options,
  };
  let findResult: FindExpResult = {
    expIndex: -1,
    exp: null,
    nextIndex: 0,
  };
  let lastUnreadLength;
  do {
    // console.log('context.unread', context.unread);
    lastUnreadLength = context.unread.length;
    findResult = findKeyToken(context.unread, context.currentDelimiter);
    handleKeyTokenFindResult(context, findResult);
    // Prevent infinite loop by returning incorrect result
    if (lastUnreadLength === context.unread.length) {
      read(context, context.unread.length);
    }
  } while (context.unread !== '');
  publishStatement(context);
  // console.log('RESULT', context.output);
  return context.output;
}
