import _ from 'lodash';
import GridConfig from './GridConfig';
import { ForeignKeyInfo } from '@dbgate/types';

export interface DisplayColumn {
  columnName: string;
  headerText: string;
  uniqueName: string;
  uniquePath: string[];
  notNull: boolean;
  autoIncrement: boolean;
  isPrimaryKey: boolean;
  foreignKey: ForeignKeyInfo;
  isChecked: boolean;
}

export default abstract class GridDisplay {
  constructor(public config: GridConfig, protected setConfig: (config: GridConfig) => void) {}
  abstract getPageQuery(offset: number, count: number): string;
  columns: DisplayColumn[];
  setColumnVisibility(uniqueName, isVisible) {
    if (isVisible) {
      this.setConfig({
        ...this.config,
        hiddenColumns: (this.config.hiddenColumns || []).filter(x => x != uniqueName),
      });
    } else {
      this.setConfig({
        ...this.config,
        hiddenColumns: [...(this.config.hiddenColumns || []), uniqueName],
      });
    }
  }

  get hiddenColumnIndexes() {
    return (this.config.hiddenColumns || []).map(x => _.findIndex(this.columns, y => y.uniqueName == x));
  }
}
