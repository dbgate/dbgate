import React from 'react';
import axios from '../utility/axios';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { AppObjectCore } from './AppObjectCore';
import useNewQuery from '../query/useNewQuery';
import { openNewTab } from '../utility/common';
import { useSetOpenedTabs } from '../utility/globalState';

function Menu({ data }) {
  const handleDelete = () => {
    axios.post('files/delete', data);
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

export function SavedFileAppObjectBase({ data, commonProps, format, icon, onLoad }) {
  const { file, folder } = data;

  const onClick = async () => {
    const resp = await axios.post('files/load', { folder, file, format });
    onLoad(resp.data);
  };

  return <AppObjectCore {...commonProps} data={data} title={file} icon={icon} onClick={onClick} Menu={Menu} />;
}

export function SavedSqlFileAppObject({ data, commonProps }) {
  const { file, folder } = data;
  const newQuery = useNewQuery();

  return (
    <SavedFileAppObjectBase
      data={data}
      commonProps={commonProps}
      format="text"
      icon="img sql-file"
      onLoad={(data) => {
        newQuery({
          title: file,
          // @ts-ignore
          initialScript: data,
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
        openNewTab(setOpenedTabs, {
          title: file,
          icon: 'img shell',
          tabComponent: 'ShellTab',
          props: {
            initialScript: data,
          },
        });
      }}
    />
  );
}

[SavedSqlFileAppObject, SavedShellFileAppObject].forEach((fn) => {
  // @ts-ignore
  fn.extractKey = (data) => data.file;
});
