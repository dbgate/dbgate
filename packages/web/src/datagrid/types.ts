import { GridDisplay, ChangeSet } from '@dbgate/datalib';

export interface DataGridProps {
  conid: number;
  database: string;
  display: GridDisplay;
  tabVisible?: boolean;
  changeSet?: ChangeSet;
  setChangeSet?: Function;
}
