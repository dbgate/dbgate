import { PerspectiveDataLoader } from './PerspectiveDataLoader';
import { PerspectiveDataLoadProps } from './PerspectiveTreeNode';

export interface PerspectiveDataCache {}

export class PerspectiveDataProvider {
  constructor(
    public cache: PerspectiveDataCache,
    public setCache: (value: PerspectiveDataCache) => void,
    public loader: PerspectiveDataLoader
  ) {}
  async loadData(props: PerspectiveDataLoadProps): Promise<{ rows: any[]; incomplete: boolean }> {
    return {
      rows: await this.loader.loadData(props),
      incomplete: true,
    };
  }
}
