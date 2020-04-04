import { useSetOpenedTabs } from '../utility/globalState';
import { openNewTab } from '../utility/common';

export default function useNewQuery() {
  const setOpenedTabs = useSetOpenedTabs();

  return () =>
    openNewTab(setOpenedTabs, {
      title: 'Query',
      icon: 'sql.svg',
      tabComponent: 'QueryTab',
      // props: {
      //   schemaName,
      //   pureName,
      //   conid,
      //   database,
      // },
    });
}
