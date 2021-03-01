import _ from 'lodash';
import { currentDatabase, openedTabs } from '../stores';

let lastCurrentTab = null;

openedTabs.subscribe(value => {
  const newCurrentTab = (value || []).find(x => x.selected);
  if (newCurrentTab == lastCurrentTab) return;

  if (newCurrentTab) {
    const { conid, database } = newCurrentTab.props || {};
    if (
      conid &&
      database &&
      (conid != _.get(lastCurrentTab, 'props.conid') || database != _.get(lastCurrentTab, 'props.database'))
    ) {
      currentDatabase.set({
        connection: { _id: conid },
        name: database,
      });
    }
  }

  lastCurrentTab = newCurrentTab;
});
