import React from 'react';
import { TableIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import showModal from '../modals/showModal';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';
import { openNewTab } from '../utility/common';
import { useSetOpenedTabs } from '../utility/globalState';

/** @param columnProps {import('dbgate').ColumnInfo} */
export default function columnAppObject(columnProps, { setOpenedTabs }) {
  const title = columnProps.columnName;
  const key = title;
  const Icon = TableIcon;

  return { title, key, Icon };
}
