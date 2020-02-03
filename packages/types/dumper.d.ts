export interface SqlDumper {
  s: string;
  put(format: string, ...args);
  putCmd(format: string, ...args);
}
