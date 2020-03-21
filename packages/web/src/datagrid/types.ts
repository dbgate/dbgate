import { GridDisplay } from '@dbgate/datalib';

export interface DataGridProps {
  conid: number;
  database: string;
  display: GridDisplay;
  tabVisible?: boolean;
}
