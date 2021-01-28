import _ from 'lodash';
import useOpenNewTab from '../utility/useOpenNewTab';

export default function useNewFreeTable() {
  const openNewTab = useOpenNewTab();

  return ({ title = undefined, ...props } = {}) =>
    openNewTab({
      title: title || 'Data #',
      icon: 'img free-table',
      tabComponent: 'FreeTableTab',
      props,
    });
}
