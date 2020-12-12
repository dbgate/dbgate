import React from 'react';
import axios from '../utility/axios';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { AppObjectCore } from './AppObjectCore';
import useNewQuery from '../query/useNewQuery';
import { useCurrentDatabase, useSetOpenedTabs } from '../utility/globalState';
import ScriptWriter from '../impexp/ScriptWriter';
import { extractPackageName } from 'dbgate-tools';
import useShowModal from '../modals/showModal';
import InputTextModal from '../modals/InputTextModal';
import useHasPermission from '../utility/useHasPermission';
import useOpenNewTab from '../utility/useOpenNewTab';

function Menu({ data, menuExt = null }) {
  const hasPermission = useHasPermission();
  const showModal = useShowModal();
  const handleDelete = () => {
    axios.post('files/delete', data);
  };
  const handleRename = () => {
    showModal((modalState) => (
      <InputTextModal
        modalState={modalState}
        value={data.file}
        label="New file name"
        header="Rename file"
        onConfirm={(newFile) => {
          axios.post('files/rename', { ...data, newFile });
        }}
      />
    ));
  };
  return (
    <>
      {hasPermission(`files/${data.folder}/write`) && (
        <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
      )}
      {hasPermission(`files/${data.folder}/write`) && (
        <DropDownMenuItem onClick={handleRename}>Rename</DropDownMenuItem>
      )}
      {menuExt}
    </>
  );
}

export function SavedFileAppObjectBase({ data, commonProps, format, icon, onLoad, menuExt = null }) {
  const { file, folder } = data;

  const onClick = async () => {
    const resp = await axios.post('files/load', { folder, file, format });
    onLoad(resp.data);
  };

  return (
    <AppObjectCore
      {...commonProps}
      data={data}
      title={file}
      icon={icon}
      onClick={onClick}
      Menu={menuExt ? (props) => <Menu {...props} menuExt={menuExt} /> : Menu}
    />
  );
}

export function SavedSqlFileAppObject({ data, commonProps }) {
  const { file, folder } = data;
  const newQuery = useNewQuery();
  const currentDatabase = useCurrentDatabase();
  const openNewTab = useOpenNewTab();

  const connection = _.get(currentDatabase, 'connection');
  const database = _.get(currentDatabase, 'name');

  const handleGenerateExecute = () => {
    const script = new ScriptWriter();
    const conn = {
      ..._.omit(connection, ['displayName', '_id']),
      database,
    };
    script.put(`const sql = await dbgateApi.loadFile('${folder}/${file}');`);
    script.put(`await dbgateApi.executeQuery({ sql, connection: ${JSON.stringify(conn)} });`);
    // @ts-ignore
    script.requirePackage(extractPackageName(conn.engine));

    openNewTab(
      {
        title: 'Shell',
        icon: 'img shell',
        tabComponent: 'ShellTab',
      },
      script.getScript()
    );
  };

  return (
    <SavedFileAppObjectBase
      data={data}
      commonProps={commonProps}
      format="text"
      icon="img sql-file"
      menuExt={
        connection && database ? (
          <DropDownMenuItem onClick={handleGenerateExecute}>Generate shell execute</DropDownMenuItem>
        ) : null
      }
      onLoad={(data) => {
        newQuery({
          title: file,
          initialData: data,
        });
      }}
    />
  );
}

export function SavedShellFileAppObject({ data, commonProps }) {
  const { file, folder } = data;
  const openNewTab = useOpenNewTab();

  return (
    <SavedFileAppObjectBase
      data={data}
      commonProps={commonProps}
      format="text"
      icon="img shell"
      onLoad={(data) => {
        openNewTab(
          {
            title: file,
            icon: 'img shell',
            tabComponent: 'ShellTab',
          },
          data
        );
      }}
    />
  );
}

export function SavedChartFileAppObject({ data, commonProps }) {
  const { file, folder } = data;
  const openNewTab = useOpenNewTab();

  const currentDatabase = useCurrentDatabase();

  const connection = _.get(currentDatabase, 'connection') || {};
  const database = _.get(currentDatabase, 'name');

  const tooltip = `${connection.displayName || connection.server}\n${database}`;

  return (
    <SavedFileAppObjectBase
      data={data}
      commonProps={commonProps}
      format="json"
      icon="img chart"
      onLoad={(data) => {
        openNewTab(
          {
            title: file,
            icon: 'img chart',
            tooltip,
            props: {
              conid: connection._id,
              database,
            },
            tabComponent: 'ChartTab',
          },
          data
        );
      }}
    />
  );
}

export function SavedMarkdownFileAppObject({ data, commonProps }) {
  const { file, folder } = data;
  const openNewTab = useOpenNewTab();

  const showPage = () => {
    openNewTab({
      title: file,
      icon: 'img markdown',
      tabComponent: 'MarkdownViewTab',
      props: {
        file,
      },
    });
  };
  return (
    <SavedFileAppObjectBase
      data={data}
      commonProps={commonProps}
      format="text"
      icon="img markdown"
      onLoad={(data) => {
        openNewTab(
          {
            title: file,
            icon: 'img markdown',
            tabComponent: 'MarkdownEditorTab',
          },
          data
        );
      }}
      menuExt={<DropDownMenuItem onClick={showPage}>Show page</DropDownMenuItem>}
    />
  );
}

[SavedSqlFileAppObject, SavedShellFileAppObject, SavedChartFileAppObject, SavedMarkdownFileAppObject].forEach((fn) => {
  // @ts-ignore
  fn.extractKey = (data) => data.file;
});
