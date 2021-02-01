import React from 'react';
import axios from '../utility/axios';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { AppObjectCore } from './AppObjectCore';
import useNewQuery from '../query/useNewQuery';
import { useCurrentDatabase } from '../utility/globalState';
import ScriptWriter from '../impexp/ScriptWriter';
import { extractPackageName } from 'dbgate-tools';
import useShowModal from '../modals/showModal';
import InputTextModal from '../modals/InputTextModal';
import useHasPermission from '../utility/useHasPermission';
import useOpenNewTab from '../utility/useOpenNewTab';
import ConfirmModal from '../modals/ConfirmModal';

function Menu({ data, menuExt = null, title = undefined, disableRename = false }) {
  const hasPermission = useHasPermission();
  const showModal = useShowModal();
  const handleDelete = () => {
    showModal(modalState => (
      <ConfirmModal
        modalState={modalState}
        message={`Really delete file ${title || data.file}?`}
        onConfirm={() => {
          axios.post('files/delete', data);
        }}
      />
    ));
  };
  const handleRename = () => {
    showModal(modalState => (
      <InputTextModal
        modalState={modalState}
        value={data.file}
        label="New file name"
        header="Rename file"
        onConfirm={newFile => {
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
      {hasPermission(`files/${data.folder}/write`) && !disableRename && (
        <DropDownMenuItem onClick={handleRename}>Rename</DropDownMenuItem>
      )}
      {menuExt}
    </>
  );
}

export function SavedFileAppObjectBase({
  data,
  commonProps,
  format,
  icon,
  onLoad,
  title = undefined,
  menuExt = null,
  disableRename = false,
}) {
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
      Menu={props => <Menu {...props} menuExt={menuExt} title={title} disableRename={disableRename} />}
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
        title: 'Shell #',
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
      onLoad={data => {
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
      onLoad={data => {
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
      onLoad={data => {
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

export function SavedQueryFileAppObject({ data, commonProps }) {
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
      icon="img query-design"
      onLoad={data => {
        openNewTab(
          {
            title: file,
            icon: 'img query-design',
            tooltip,
            props: {
              conid: connection._id,
              database,
              savedFile: file,
              savedFolder: 'query',
              savedFormat: 'json',
            },
            tabComponent: 'QueryDesignTab',
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
      onLoad={data => {
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

export function SavedFileAppObject({ data, commonProps }) {
  const { folder } = data;
  const folderTypes = {
    sql: SavedSqlFileAppObject,
    shell: SavedShellFileAppObject,
    charts: SavedChartFileAppObject,
    markdown: SavedMarkdownFileAppObject,
    query: SavedQueryFileAppObject,
  };
  const AppObject = folderTypes[folder];
  if (AppObject) {
    return <AppObject data={data} commonProps={commonProps} />;
  }
  return null;
}

[
  SavedSqlFileAppObject,
  SavedShellFileAppObject,
  SavedChartFileAppObject,
  SavedMarkdownFileAppObject,
  SavedFileAppObject,
].forEach(fn => {
  // @ts-ignore
  fn.extractKey = data => data.file;
});
