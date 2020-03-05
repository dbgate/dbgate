import GridConfig from "./GridConfig";

export default abstract class GridDisplay {
  constructor(
    public config: GridConfig,
    protected setConfig: (configh: GridConfig) => void
  ) {}
  abstract getPageQuery(offset: number, count: number): string;
}
