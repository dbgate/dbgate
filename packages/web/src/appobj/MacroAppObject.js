import _ from 'lodash';
import { filterName } from 'dbgate-datalib';

const macroAppObject = () => ({ name, type, title, group }, { setOpenedTabs }) => {
  const key = name;
  const icon = 'img macro';
  const matcher = (filter) => filterName(filter, name, title);
  const groupTitle = group;

  return { title, key, icon, groupTitle, matcher };
};

export default macroAppObject;
