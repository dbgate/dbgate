import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import keycodes from '../utility/keycodes';
import GenericEditor from '../sqleditor/GenericEditor';
import useEditorData from '../utility/useEditorData';
import LoadingInfo from '../widgets/LoadingInfo';
import { useOpenedTabs, useSetOpenedTabs } from '../utility/globalState';
import useOpenNewTab from '../utility/useOpenNewTab';
import axios from '../utility/axios';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';
import useShowModal from '../modals/showModal';
import ErrorMessageModal from '../modals/ErrorMessageModal';
import { useOpenFavorite } from '../appobj/FavoriteFileAppObject';

function FavoriteEditorToolbar({ save, showPreview }) {
  const hasPermission = useHasPermission();

  return (
    <>
      {hasPermission('files/favorites/write') && save && (
        <ToolbarButton onClick={save} icon="icon save">
          Save
        </ToolbarButton>
      )}
      <ToolbarButton onClick={showPreview} icon="icon preview">
        Preview
      </ToolbarButton>
    </>
  );
}

export default function FavoriteEditorTab({ tabid, tabVisible, savedFile, toolbarPortalRef, ...other }) {
  const { editorData, setEditorData, isLoading, saveToStorage } = useEditorData({ tabid });
  const openNewTab = useOpenNewTab();
  const showModal = useShowModal();
  const openFavorite = useOpenFavorite();

  const showPreview = () => {
    try {
      const data = JSON.parse(editorData);
      openFavorite(data);
    } catch (err) {
      showModal((modalState) => (
        <ErrorMessageModal modalState={modalState} message={err.message} title="Error parsing JSON" />
      ));
    }
  };

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (keyCode == keycodes.f5) {
      event.preventDefault();
      showPreview();
    }
  };

  const handleSave = () => {
    try {
      const data = JSON.parse(editorData);
      axios.post('files/save', {
        file: savedFile,
        folder: 'favorites',
        format: 'json',
        data,
      });
    } catch (err) {
      showModal((modalState) => (
        <ErrorMessageModal modalState={modalState} message={err.message} title="Error parsing JSON" />
      ));
    }
  };

  if (isLoading) {
    return (
      <div>
        <LoadingInfo message="Loading favorite page" />
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
        mode="json"
      />
      {toolbarPortalRef &&
        toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(
          <FavoriteEditorToolbar save={handleSave} showPreview={showPreview} />,
          toolbarPortalRef.current
        )}
    </>
  );
}
