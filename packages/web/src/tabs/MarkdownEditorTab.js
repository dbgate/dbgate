import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import keycodes from '../utility/keycodes';
import GenericEditor from '../sqleditor/GenericEditor';
import MarkdownToolbar from '../markdown/MarkdownToolbar';
import useEditorData from '../utility/useEditorData';
import SaveTabModal from '../modals/SaveTabModal';
import useModalState from '../modals/useModalState';
import LoadingInfo from '../widgets/LoadingInfo';
import { useOpenedTabs, useSetOpenedTabs } from '../utility/globalState';
import useOpenNewTab from '../utility/useOpenNewTab';
import { setSelectedTabFunc } from '../utility/common';
import ToolbarPortal from '../utility/ToolbarPortal';

export default function MarkdownEditorTab({ tabid, tabVisible, toolbarPortalRef, ...other }) {
  const { editorData, setEditorData, isLoading, saveToStorage } = useEditorData({ tabid });
  const openedTabs = useOpenedTabs();
  const setOpenedTabs = useSetOpenedTabs();
  const openNewTab = useOpenNewTab();

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.f5) {
      event.preventDefault();
      showPreview();
    }
  };

  const showPreview = async () => {
    await saveToStorage();
    const existing = (openedTabs || []).find(x => x.props && x.props.sourceTabId == tabid && x.closedTime == null);
    if (existing) {
      setOpenedTabs(tabs => setSelectedTabFunc(tabs, existing.tabid));
    } else {
      const thisTab = (openedTabs || []).find(x => x.tabid == tabid);
      openNewTab({
        title: thisTab.title,
        icon: 'img preview',
        tabComponent: 'MarkdownPreviewTab',
        props: {
          sourceTabId: tabid,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div>
        <LoadingInfo message="Loading markdown page" />
      </div>
    );
  }

  return (
    <>
      <GenericEditor
        value={editorData || ''}
        onChange={setEditorData}
        tabVisible={tabVisible}
        onKeyDown={handleKeyDown}
        mode="markdown"
      />
      <ToolbarPortal toolbarPortalRef={toolbarPortalRef} tabVisible={tabVisible}>
        <MarkdownToolbar showPreview={showPreview} />
      </ToolbarPortal>
      <SaveTabModal
        tabVisible={tabVisible}
        toolbarPortalRef={toolbarPortalRef}
        data={editorData}
        format="text"
        folder="markdown"
        tabid={tabid}
        fileExtension="md"
      />
    </>
  );
}
