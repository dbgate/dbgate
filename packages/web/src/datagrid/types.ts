import { GridDisplay, ChangeSet } from '@dbgate/datalib';

export interface DataGridProps {
  conid?: number;
  database?: string;
  display: GridDisplay;
  tabVisible?: boolean;
  changeSetState?: { value: ChangeSet };
  dispatchChangeSet?: Function;
  toolbarPortalRef?: any;
}
