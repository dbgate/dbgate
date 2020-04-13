import React from 'react';
import _ from 'lodash';
import { SqlIcon } from '../icons';
import { openNewTab } from '../utility/common';

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
      console.log('OPENING QUERY', title, storageKey);

      newQuery({
        title,
        storageKey,
      });
    }
  };

  return { title, key, Icon, onClick };
};

export default savedSqlFileAppObject;
