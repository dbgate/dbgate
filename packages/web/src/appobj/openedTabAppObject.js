import React from 'react';
import _ from 'lodash';
import { getIconImage } from '../icons';

const openedTabAppObject = () => ({ tabid, props, selected, icon, title }, { setOpenedTabs }) => {
  const key = tabid;
  const Icon = (props) => getIconImage(icon, props);
  const isBold = !!selected;

  const onClick = () => {
    setOpenedTabs((files) =>
      files.map((x) => ({
        ...x,
        selected: x.tabid == tabid,
      }))
    );
  };

  return { title, key, Icon, isBold, onClick };
};

export default openedTabAppObject;
