import _ from 'lodash';
import { getCurrentDatabase } from '../stores';
import { getConnectionLabel, getSqlFrontMatter, setSqlFrontMatter } from 'dbgate-tools';
import yaml from 'js-yaml';
import openNewTab from '../utility/openNewTab';

export default function newQuery({
  tabComponent = 'QueryTab',
  icon = 'img sql-file',
  title = undefined,
  initialData = undefined,
  multiTabIndex = undefined,
  fixCurrentConnection = false,
  ...props
} = {}) {
  const currentDb = getCurrentDatabase();
  const connection = currentDb?.connection || {};
  const database = currentDb?.name;

  const tooltip = `${getConnectionLabel(connection)}\n${database}`;

  if (fixCurrentConnection && !_.isEmpty(connection)) {
    const frontMatter = getSqlFrontMatter(initialData, yaml);
    const newFrontMatter = {
      ...frontMatter,
      connectionId: connection._id,
      databaseName: database,
    };
    initialData = setSqlFrontMatter(initialData, newFrontMatter, yaml);
  }

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
