import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import keycodes from '../utility/keycodes';
import GenericEditor from '../sqleditor/GenericEditor';
import MarkdownToolbar from '../charts/MarkdownToolbar';
import useEditorData from '../utility/useEditorData';
import SaveTabModal from '../modals/SaveTabModal';
import useModalState from '../modals/useModalState';
import LoadingInfo from '../widgets/LoadingInfo';

export default function MarkdownEditorTab({ tabid, tabVisible, toolbarPortalRef, ...other }) {
  const { editorData, setEditorData, isLoading } = useEditorData({ tabid });
  const saveFileModalState = useModalState();

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.f5) {
      event.preventDefault();
      // handlePreview();
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
      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(<MarkdownToolbar save={saveFileModalState.open} />, toolbarPortalRef.current)}
      <SaveTabModal
        modalState={saveFileModalState}
        tabVisible={tabVisible}
        data={editorData}
        format="text"
        folder="markdown"
        tabid={tabid}
      />
    </>
  );
}
