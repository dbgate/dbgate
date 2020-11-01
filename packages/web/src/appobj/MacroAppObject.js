import _ from 'lodash';
import { filterName } from '@dbgate/datalib';
import { MacroIcon, StartIcon } from '../icons';

const macroAppObject = () => ({ name, type, title, group }, { setOpenedTabs }) => {
  const key = name;
  // const Icon = (props) => <i className="fas fa-archive" />;
  const Icon = MacroIcon;
  const matcher = (filter) => filterName(filter, name, title);
  const groupTitle = group;

  return { title, key, Icon, groupTitle, matcher };
};

export default macroAppObject;
