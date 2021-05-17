import _ from 'lodash';
import { currentDatabase, openedTabs } from '../stores';
import { callWhenAppLoaded } from './appLoadManager';
import { getConnectionInfo } from './metadataLoaders';

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
      const doWork = async () => {
        const connection = await getConnectionInfo({ conid });
        currentDatabase.set({
          connection,
          name: database,
        });
      };
      callWhenAppLoaded(doWork);
    }
  }

  lastCurrentTab = newCurrentTab;
});
