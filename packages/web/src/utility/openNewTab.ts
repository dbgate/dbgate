import uuidv1 from 'uuid/v1';
import { openedTabs } from '../stores';

export default async function openNewTab(newTab, initialData = undefined, options = undefined) {
  console.log('OPENING NEW TAB', newTab);
  const tabid = uuidv1();
  openedTabs.update(tabs => [
    ...(tabs || []).map(x => ({ ...x, selected: false })),
    {
      tabid,
      selected: true,
      ...newTab,
    },
  ]);
}
