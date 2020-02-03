import React from 'react';
import { ColumnIcon, SequenceIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import showModal from '../modals/showModal';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';
import { openNewTab } from '../utility/common';
import { useSetOpenedTabs } from '../utility/globalState';

/** @param columnProps {import('dbgate').ColumnInfo} */
function getColumnIcon(columnProps) {
  if (columnProps.autoIncrement) return SequenceIcon;
  return ColumnIcon;
}

/** @param columnProps {import('dbgate').ColumnInfo} */
export default function columnAppObject(columnProps, { setOpenedTabs }) {
  const title = columnProps.columnName;
  const key = title;
  const Icon = getColumnIcon(columnProps);
  const isBold = columnProps.notNull;

  return { title, key, Icon, isBold };
}
