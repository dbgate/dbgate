export interface SplitterOptions {
  stringsBegins: string[];
  stringsEnds: { string: string };
  stringEscapes: string[];

  allowSemicolon: boolean;
  allowCustomDelimiter: boolean;
  allowGoDelimiter: boolean;
  allowDollarDollarString: boolean;
}

export const defaultSplitterOptions = {
  stringsBegins: ["'"],
  stringsEnds: { "'": "'" },
  stringEscapes: { "'": "'" },

  allowSemicolon: true,
  allowCustomDelimiter: false,
  allowGoDelimiter: false,
};

export const mysqlSplitterOptions = {
  ...defaultSplitterOptions,

  stringsBegins: ["'", '`'],
  stringsEnds: { "'": "'", '`': '`' },
  stringEscapes: { "'": '\\', '`': '`' },
};

export const mssqlSplitterOptions = {
  ...defaultSplitterOptions,
  allowSemicolon: false,
  allowGoDelimiter: true,

  stringsBegins: ["'", '['],
  stringsEnds: { "'": "'", '[': ']' },
  stringEscapes: { "'": "'" },
};

export const postgreSplitterOptions = {
  ...defaultSplitterOptions,

  allowDollarDollarString: true,

  stringsBegins: ["'", '"'],
  stringsEnds: { "'": "'", '"': '"' },
  stringEscapes: { "'": "'", '"': '"' },
};
