import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { DatabaseIcon, getIconImage, ArchiveTableIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';

function Menu({ data, setOpenedTabs }) {
  const handleDelete = () => {
    // setOpenedTabs((tabs) => tabs.filter((x) => x.tabid != data.tabid));
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

const archiveFileAppObject = () => ({ fileName, folderName }, { setOpenedTabs }) => {
  const key = fileName;
  // const Icon = (props) => <i className="fas fa-archive" />;
  const Icon = ArchiveTableIcon;
  const onClick = () => {
    openNewTab(setOpenedTabs, {
      title: fileName,
      icon: 'archtable.svg',
      tooltip: `${folderName}\n${fileName}`,
      tabComponent: 'ArchiveFileTab',
      props: {
        fileName,
        folderName,
      },
    });
  };

  return { title: fileName, key, Icon, Menu, onClick };
};

export default archiveFileAppObject;
