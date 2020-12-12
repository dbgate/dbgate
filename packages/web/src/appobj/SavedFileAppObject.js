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

export function SavedFileAppObjectBase({ data, commonProps, format, icon, onLoad, title = undefined, menuExt = null }) {
  const { file, folder } = data;

  const onClick = async () => {
    const resp = await axios.post('files/load', { folder, file, format });
    onLoad(resp.data);
  };

  return (
    <AppObjectCore
      {...commonProps}
      data={data}
      title={title || file}
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
      { editor: script.getScript() }
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
          // @ts-ignore
          savedFile: file,
          savedFolder: 'sql',
          savedFormat: 'text',
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
            props: {
              savedFile: file,
              savedFolder: 'shell',
              savedFormat: 'text',
            },
          },
          { editor: data }
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
              savedFile: file,
              savedFolder: 'charts',
              savedFormat: 'json',
            },
            tabComponent: 'ChartTab',
          },
          { editor: data }
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
        savedFile: file,
        savedFolder: 'markdown',
        savedFormat: 'text',
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
            props: {
              savedFile: file,
              savedFolder: 'markdown',
              savedFormat: 'text',
            },
          },
          { editor: data }
        );
      }}
      menuExt={<DropDownMenuItem onClick={showPage}>Show page</DropDownMenuItem>}
    />
  );
}

export function FavoriteFileAppObject({ data, commonProps }) {
  const { file, folder, icon, tabComponent, title, props, tabdata } = data;
  const openNewTab = useOpenNewTab();

  return (
    <SavedFileAppObjectBase
      data={data}
      commonProps={commonProps}
      format="json"
      icon={icon || 'img favorite'}
      title={title}
      onLoad={async (data) => {
        let tabdataNew = tabdata;
        if (props.savedFile) {
          const resp = await axios.post('files/load', {
            folder: props.savedFolder,
            file: props.savedFile,
            format: props.savedFormat,
          });
          tabdataNew = {
            ...tabdata,
            editor: resp.data,
          };
        }
        openNewTab(
          {
            title,
            icon: icon || 'img favorite',
            props,
            tabComponent,
          },
          tabdataNew
        );
      }}
    />
  );
}

[
  SavedSqlFileAppObject,
  SavedShellFileAppObject,
  SavedChartFileAppObject,
  SavedMarkdownFileAppObject,
  FavoriteFileAppObject,
].forEach((fn) => {
  // @ts-ignore
  fn.extractKey = (data) => data.file;
});
