import React from 'react';
import JslDataGrid from '../sqleditor/JslDataGrid';

export default function ArchiveFileTab({ archiveFolder, archiveFile, tabVisible, toolbarPortalRef, tabid }) {
  return <JslDataGrid jslid={`archive://${archiveFolder}/${archiveFile}`} />;
}
