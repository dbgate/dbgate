import React from 'react';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import ImportExportModal from '../modals/ImportExportModal';
import { getDefaultFileFormat } from '../utility/fileformats';
import { useCurrentDatabase, useSetOpenedTabs } from '../utility/globalState';
import { AppObjectCore } from './AppObjectCore';
import useShowModal from '../modals/showModal';
import useExtensions from '../utility/useExtensions';

function Menu({ data }) {
  const { connection, name } = data;
  const setOpenedTabs = useSetOpenedTabs();
  const extensions = useExtensions();
  const showModal = useShowModal();

  const tooltip = `${connection.displayName || connection.server}\n${name}`;

  const handleNewQuery = () => {
    openNewTab(setOpenedTabs, {
      title: 'Query',
      icon: 'img sql-file',
      tooltip,
      tabComponent: 'QueryTab',
      props: {
        conid: connection._id,
        database: name,
      },
    });
  };

  const handleImport = () => {
    showModal((modalState) => (
      <ImportExportModal
        modalState={modalState}
        initialValues={{
          sourceStorageType: getDefaultFileFormat(extensions).storageType,
          targetStorageType: 'database',
          targetConnectionId: connection._id,
          targetDatabaseName: name,
        }}
      />
    ));
  };

  const handleExport = () => {
    showModal((modalState) => (
      <ImportExportModal
        modalState={modalState}
        initialValues={{
          targetStorageType: getDefaultFileFormat(extensions).storageType,
          sourceStorageType: 'database',
          sourceConnectionId: connection._id,
          sourceDatabaseName: name,
        }}
      />
    ));
  };

  return (
    <>
      <DropDownMenuItem onClick={handleNewQuery}>New query</DropDownMenuItem>
      <DropDownMenuItem onClick={handleImport}>Import</DropDownMenuItem>
      <DropDownMenuItem onClick={handleExport}>Export</DropDownMenuItem>
    </>
  );
}

function DatabaseAppObject({ data, commonProps }) {
  const { name, connection } = data;
  const currentDatabase = useCurrentDatabase();
  return (
    <AppObjectCore
      {...commonProps}
      data={data}
      title={name}
      icon="img database"
      isBold={
        _.get(currentDatabase, 'connection._id') == _.get(connection, '_id') && _.get(currentDatabase, 'name') == name
      }
      Menu={Menu}
    />
  );
}

DatabaseAppObject.extractKey = (props) => props.name;

export default DatabaseAppObject;
