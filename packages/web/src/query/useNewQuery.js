import _ from 'lodash';
import { useSetOpenedTabs, useCurrentDatabase } from '../utility/globalState';
import { openNewTab } from '../utility/common';

export default function useNewQuery() {
  const setOpenedTabs = useSetOpenedTabs();
  const currentDatabase = useCurrentDatabase();

  const connection = _.get(currentDatabase, 'connection') || {};
  const database = _.get(currentDatabase, 'name');

  const tooltip = `${connection.displayName || connection.server}\n${database}`;

  return ({ title = undefined, initialData = undefined, ...props } = {}) =>
    openNewTab(
      setOpenedTabs,
      {
        title: title || 'Query',
        icon: 'img sql-file',
        tooltip,
        tabComponent: 'QueryTab',
        props: {
          ...props,
          conid: connection._id,
          database,
        },
      },
      initialData
    );
}
