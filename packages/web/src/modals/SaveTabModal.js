import React from 'react';
import { changeTab } from '../utility/common';
import { useOpenedTabs, useSetOpenedTabs } from '../utility/globalState';
import SaveFileModal from './SaveFileModal';

export default function SaveTabModal({ data, folder, format, modalState, tabid }) {
  const setOpenedTabs = useSetOpenedTabs();
  const openedTabs = useOpenedTabs();

  const name = openedTabs.find((x) => x.tabid == tabid).title;
  const onSave = (name) => changeTab(tabid, setOpenedTabs, (tab) => ({ ...tab, title: name }));

  return (
    <SaveFileModal data={data} folder={folder} format={format} modalState={modalState} name={name} onSave={onSave} />
  );
}
