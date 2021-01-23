import React from 'react';
import useSocket from '../utility/SocketProvider';
import axios from '../utility/axios';
import styled from 'styled-components';
import TableControl, { TableColumn } from '../utility/TableControl';
import formatFileSize from '../utility/formatFileSize';
import resolveApi from '../utility/resolveApi';
import getElectron from '../utility/getElectron';
import ErrorInfo from '../widgets/ErrorInfo';

export default function RunnerOutputFiles({ runnerId, executeNumber }) {
  const socket = useSocket();
  const [files, setFiles] = React.useState([]);

  const handleRunnerDone = React.useCallback(async () => {
    const resp = await axios.get(`runners/files?runid=${runnerId}`);
    setFiles(resp.data);
  }, [runnerId]);

  React.useEffect(() => {
    if (runnerId && socket) {
      socket.on(`runner-done-${runnerId}`, handleRunnerDone);
      return () => {
        socket.off(`runner-done-${runnerId}`, handleRunnerDone);
      };
    }
  }, [runnerId, socket]);

  React.useEffect(() => {
    setFiles([]);
  }, [executeNumber]);

  const electron = getElectron();

  if (!files || files.length == 0) {
    return <ErrorInfo message="No output files" icon="img alert" />;
  }

  return (
    <TableControl rows={files}>
      <TableColumn fieldName="name" header="Name" />
      <TableColumn fieldName="size" header="Size" formatter={row => formatFileSize(row.size)} />
      {!electron && (
        <TableColumn
          fieldName="download"
          header="Download"
          formatter={row => (
            <a href={`${resolveApi()}/runners/data/${runnerId}/${row.name}`} target="_blank" rel="noopener noreferrer">
              download
            </a>
          )}
        />
      )}
      {electron && (
        <TableColumn
          fieldName="copy"
          header="Copy"
          formatter={row => (
            <a
              href="#"
              onClick={() => {
                const file = electron.remote.dialog.showSaveDialogSync(electron.remote.getCurrentWindow(), {});
                if (file) {
                  const fs = window.require('fs');
                  fs.copyFile(row.path, file, () => {});
                }
              }}
            >
              save
            </a>
          )}
        />
      )}
      {electron && (
        <TableColumn
          fieldName="show"
          header="Show"
          formatter={row => (
            <a
              href="#"
              onClick={() => {
                electron.remote.shell.showItemInFolder(row.path);
              }}
            >
              show
            </a>
          )}
        />
      )}
    </TableControl>
  );
}
