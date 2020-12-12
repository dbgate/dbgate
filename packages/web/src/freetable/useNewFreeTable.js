import _ from 'lodash';
import useOpenNewTab from '../utility/useOpenNewTab';

export default function useNewFreeTable() {
  const openNewTab = useOpenNewTab();

  return ({ title = undefined, ...props } = {}) =>
    openNewTab({
      title: title || 'Table',
      icon: 'img free-table',
      tabComponent: 'FreeTableTab',
      props,
    });
}
