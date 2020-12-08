import React from 'react';
import axios from '../utility/axios';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { AppObjectCore } from './AppObjectCore';
import useNewQuery from '../query/useNewQuery';
import { openNewTab } from '../utility/common';
import { useCurrentDatabase, useSetOpenedTabs } from '../utility/globalState';
import ScriptWriter from '../impexp/ScriptWriter';
import { extractPackageName } from 'dbgate-tools';

function Menu({ data, menuExt = null }) {
  const handleDelete = () => {
    axios.post('files/delete', data);
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
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
  const setOpenedTabs = useSetOpenedTabs();

  const connection = _.get(currentDatabase, 'connection');
  const database = _.get(currentDatabase, 'name');

  const handleGenerateExecute = () => {
    const script = new ScriptWriter();
    const conn = {
      ..._.omit(connection, ['displayName', '_id']),
      database,
    };
    script.put(`const sql = await dbgateApi.loadFile('${folder}/${file}');`)
    script.put(`await dbgateApi.executeQuery({ sql, connection: ${JSON.stringify(conn)} });`)
    // @ts-ignore
    script.requirePackage(extractPackageName(conn.engine));

    openNewTab(
      setOpenedTabs,
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
  const setOpenedTabs = useSetOpenedTabs();
  return (
    <SavedFileAppObjectBase
      data={data}
      commonProps={commonProps}
      format="text"
      icon="img shell"
      onLoad={(data) => {
        openNewTab(
          setOpenedTabs,
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

[SavedSqlFileAppObject, SavedShellFileAppObject].forEach((fn) => {
  // @ts-ignore
  fn.extractKey = (data) => data.file;
});
