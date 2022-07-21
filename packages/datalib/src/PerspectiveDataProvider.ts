import { PerspectiveDataLoadProps } from './PerspectiveTreeNode';

export interface PerspectiveDataCache {}

export class PerspectiveDataProvider {
  constructor(
    public cache: PerspectiveDataCache,
    public setCache: (value: PerspectiveDataCache) => void,
    public loader: (props: PerspectiveDataLoadProps) => Promise<any[]>
  ) {}
  async loadData(props: PerspectiveDataLoadProps) {
    return await this.loader(props);
  }
}
