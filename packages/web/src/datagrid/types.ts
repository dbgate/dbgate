import { GridDisplay, ChangeSet, GridReferenceDefinition } from 'dbgate-datalib';
import Grider from './Grider';

export interface DataGridProps {
  display: GridDisplay;
  tabVisible?: boolean;
  changeSetState?: { value: ChangeSet };
  dispatchChangeSet?: Function;
  toolbarPortalRef?: any;
  showReferences?: boolean;
  onReferenceClick?: (def: GridReferenceDefinition) => void;
  onReferenceSourceChanged?: Function;
  refReloadToken?: string;
  masterLoadedTime?: number;
  managerSize?: number;
  grider?: Grider;
  conid?: string;
  database?: string;
  jslid?: string;

  [field: string]: any;
}

// export interface DataGridCoreProps extends DataGridProps {
//   rows: any[];
//   loadNextData?: Function;
//   exportGrid?: Function;
//   openQuery?: Function;
//   undo?: Function;
//   redo?: Function;

//   errorMessage?: string;
//   isLoadedAll?: boolean;
//   loadedTime?: any;
//   allRowCount?: number;
//   conid?: string;
//   database?: string;
//   insertedRowCount?: number;
//   isLoading?: boolean;
// }

// export interface LoadingDataGridProps extends DataGridProps {
//   conid?: string;
//   database?: string;
//   jslid?: string;
// }
