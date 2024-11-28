import _ from 'lodash';
import { getCurrentDatabase } from '../stores';
import { getConnectionLabel } from 'dbgate-tools';
import openNewTab from '../utility/openNewTab';

export default function newQuery({
  tabComponent = 'QueryTab',
  icon = 'img sql-file',
  title = undefined,
  initialData = undefined,
  multiTabIndex = undefined,
  ...props
} = {}) {
  const currentDb = getCurrentDatabase();
  const connection = currentDb?.connection || {};
  const database = currentDb?.name;

  const tooltip = `${getConnectionLabel(connection)}\n${database}`;

  openNewTab(
    {
      title: title || 'Query #',
      icon,
      tooltip,
      tabComponent,
      multiTabIndex,
      focused: true,
      props: {
        ...props,
        conid: connection._id,
        database,
      },
    },
    { editor: initialData }
  );
}

export function newQueryDesign() {
  return newQuery({ tabComponent: 'QueryDesignTab', icon: 'img query-design' });
}

export function newDiagram() {
  return newQuery({ tabComponent: 'DiagramTab', icon: 'img diagram', title: 'Diagram #' });
}

export function newPerspective() {
  return newQuery({ tabComponent: 'PerspectiveTab', icon: 'img perspective', title: 'Perspective #' });
}
