import React from 'react';
import _ from 'lodash';
import { SqlIcon } from '../icons';
import { openNewTab } from '../utility/common';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { useSetSavedSqlFiles } from '../utility/globalState';

function Menu({ data, setSavedSqlFiles }) {
  const handleDelete = () => {
    setSavedSqlFiles((files) => files.filter((x) => x.storageKey != data.storageKey));
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

const savedSqlFileAppObject = () => ({ name, storageKey }, { setOpenedTabs, newQuery, openedTabs }) => {
  const key = storageKey;
  const title = name;
  const Icon = SqlIcon;

  const onClick = () => {
    const existing = openedTabs.find((x) => x.props && x.props.storageKey == storageKey);
    if (existing) {
      setOpenedTabs(
        openedTabs.map((x) => ({
          ...x,
          selected: x == existing,
        }))
      );
    } else {
      newQuery({
        title,
        storageKey,
      });
    }
  };

  return { title, key, Icon, onClick, Menu };
};

export default savedSqlFileAppObject;
