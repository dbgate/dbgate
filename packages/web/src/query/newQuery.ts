import _ from 'lodash';
import { get } from 'svelte/store';
import { currentDatabase } from '../stores';
import getConnectionLabel from '../utility/getConnectionLabel';
import openNewTab from '../utility/openNewTab';

export default function newQuery({
  tabComponent = 'QueryTab',
  icon = 'img sql-file',
  title = undefined,
  initialData = undefined,
  ...props
} = {}) {
  const $currentDatabase = get(currentDatabase);
  const connection = _.get($currentDatabase, 'connection') || {};
  const database = _.get($currentDatabase, 'name');

  const tooltip = `${getConnectionLabel(connection)}\n${database}`;

  openNewTab(
    {
      title: title || 'Query #',
      icon,
      tooltip,
      tabComponent,
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
