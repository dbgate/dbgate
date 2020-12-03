import React from 'react';
import axios from '../utility/axios';
import _ from 'lodash';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { AppObjectCore } from './AppObjectCore';
import useNewQuery from '../query/useNewQuery';

function Menu({ data }) {
  const handleDelete = () => {
    axios.post('files/delete', { folder: 'sql', file: data.name });
  };
  return (
    <>
      <DropDownMenuItem onClick={handleDelete}>Delete</DropDownMenuItem>
    </>
  );
}

function SavedSqlFileAppObject({ data, commonProps }) {
  const { file } = data;
  const newQuery = useNewQuery();

  const onClick = async () => {
    const resp = await axios.post('files/load', { folder: 'sql', file, format: 'text' });
    newQuery({
      title: file,
      // @ts-ignore
      initialScript: resp.data,
    });
  };

  return <AppObjectCore {...commonProps} data={data} title={file} icon="img sql-file" onClick={onClick} Menu={Menu} />;
}

SavedSqlFileAppObject.extractKey = (data) => data.file;

export default SavedSqlFileAppObject;
