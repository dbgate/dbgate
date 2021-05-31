import { SplitterOptions } from './options';

export interface State {
  options: SplitterOptions;
  start: number;
  end: number;
  position: number;
  input: string;

  // unread: string;
  // currentDelimiter: string;
  // currentStatement: string;
  // output: string[];
  semicolonKeyTokenRegex: RegExp;
}

export interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
}
