import GridConfig from "./GridConfig";

export interface DisplayColumn {
  columnName: string;
}

export default abstract class GridDisplay {
  constructor(
    public config: GridConfig,
    protected setConfig: (configh: GridConfig) => void
  ) {}
  abstract getPageQuery(offset: number, count: number): string;
  columns: DisplayColumn[];
}
