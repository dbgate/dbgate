import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { useSetOpenedTabs } from '../utility/globalState';
import { AppObjectCore } from './AppObjectCore';
import { setSelectedTabFunc } from '../utility/common';

function Menu({ data }) {
  const setOpenedTabs = useSetOpenedTabs();
  const handleDelete = () => {
    setOpenedTabs(tabs => tabs.filter(x => x.tabid != data.tabid));
  };
  const handleDeleteOlder = () => {
    setOpenedTabs(tabs => tabs.filter(x => !x.closedTime || x.closedTime >= data.closedTime));
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
      <DropDownMenuItem onClick={handleDeleteOlder}>Delete older</DropDownMenuItem>
    </>
  );
}

function ClosedTabAppObject({ data, commonProps }) {
  const { tabid, props, selected, icon, title, closedTime, busy } = data;
  const setOpenedTabs = useSetOpenedTabs();

  const onClick = () => {
    setOpenedTabs(files =>
      setSelectedTabFunc(
        files.map(
          x => ({
            ...x,
            closedTime: x.tabid == tabid ? undefined : x.closedTime,
          }),
          tabid
        )
      )
    );
  };

  return (
    <AppObjectCore
      {...commonProps}
      data={data}
      title={`${title} ${moment(closedTime).fromNow()}`}
      icon={icon}
      isBold={!!selected}
      onClick={onClick}
      isBusy={busy}
      Menu={Menu}
    />
  );
}

ClosedTabAppObject.extractKey = data => data.tabid;

export default ClosedTabAppObject;
