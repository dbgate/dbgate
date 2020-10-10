import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { getIconImage } from '../icons';

const closedTabAppObject = () => ({ tabid, props, selected, icon, title, closedTime, busy }, { setOpenedTabs }) => {
  const key = tabid;
  const Icon = (props) => getIconImage(icon, props);
  const isBold = !!selected;

  const onClick = () => {
    setOpenedTabs((files) =>
      files.map((x) => ({
        ...x,
        selected: x.tabid == tabid,
        closedTime: x.tabid == tabid ? undefined : x.closedTime,
      }))
    );
  };

  return { title: `${title} ${moment(closedTime).fromNow()}`, key, Icon, isBold, onClick, isBusy: busy };
};

export default closedTabAppObject;
