export interface SplitterOptions {
  allowBacktickString: boolean;
  allowIndexParenString: boolean;
  allowSemicolon: boolean;
  allowCustomDelimiter: boolean;
  allowGoDelimiter: boolean;
  allowDollarDollarString: boolean;
}

export const defaultSplitterOptions = {
  allowBacktickString: false,
  allowSemicolon: true,
  allowCustomDelimiter: false,
  allowGoDelimiter: false,
  allowDollarDollarString: false,
  allowIndexParenString: false,
};

export const mysqlSplitterOptions = {
  ...defaultSplitterOptions,
  allowCustomDelimiter: true,
  allowBacktickString: true,
};

export const mssqlSplitterOptions = {
  ...defaultSplitterOptions,
  allowSemicolon: false,
  allowGoDelimiter: true,
  allowIndexParenString: true,
};

export const postgreSplitterOptions = {
  ...defaultSplitterOptions,
  allowDollarDollarString: true,
};
