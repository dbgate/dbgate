import React from 'react';
import axios from '../utility/axios';
import useOpenNewTab from '../utility/useOpenNewTab';
import { SavedFileAppObjectBase } from './SavedFileAppObject';

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
      disableRename
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

FavoriteFileAppObject.extractKey = (data) => data.file;
