import _ from 'lodash';
import { currentDatabase, openedTabs } from '../stores';
import { getConnectionInfo } from './metadataLoaders';

let lastCurrentTab = null;

openedTabs.subscribe(async value => {
  const newCurrentTab = (value || []).find(x => x.selected);
  if (newCurrentTab == lastCurrentTab) return;

  if (newCurrentTab) {
    const { conid, database } = newCurrentTab.props || {};
    if (
      conid &&
      database &&
      (conid != _.get(lastCurrentTab, 'props.conid') || database != _.get(lastCurrentTab, 'props.database'))
    ) {
      const connection = await getConnectionInfo({ conid });
      currentDatabase.set({
        connection,
        name: database,
      });
    }
  }

  lastCurrentTab = newCurrentTab;
});
