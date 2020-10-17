import React from 'react';
import JslDataGrid from '../sqleditor/JslDataGrid';

export default function ArchiveFileTab({ folderName, fileName, tabVisible, toolbarPortalRef, tabid }) {
  return <JslDataGrid jslid={`archive://${folderName}/${fileName}`} />;
}
