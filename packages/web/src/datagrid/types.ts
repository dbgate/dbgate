import { GridDisplay, ChangeSet, GridReferenceDefinition } from '@dbgate/datalib';

export interface DataGridProps {
  conid?: string;
  database?: string;
  display: GridDisplay;
  tabVisible?: boolean;
  changeSetState?: { value: ChangeSet };
  dispatchChangeSet?: Function;
  toolbarPortalRef?: any;
  jslid?: string;
  showReferences?: boolean;
  onReferenceClick?: (def: GridReferenceDefinition) => void;
  onRefSourceRowsChanged?: Function;
  refReloadToken?: string;
}
