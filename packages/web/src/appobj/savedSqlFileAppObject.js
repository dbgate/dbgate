import React from 'react';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';

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
  const icon = 'img sql-file';

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

  return { title, key, icon, onClick, Menu };
};

export default savedSqlFileAppObject;
