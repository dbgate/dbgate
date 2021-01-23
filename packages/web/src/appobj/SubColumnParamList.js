import { findForeignKeyForColumn } from 'dbgate-tools';
import React from 'react';
import { getColumnIcon } from '../datagrid/ColumnLabel';
import { AppObjectCore } from './AppObjectCore';
import { AppObjectList } from './AppObjectList';

function ColumnAppObject({ data, commonProps }) {
  const { columnName, dataType } = data;
  return (
    <AppObjectCore
      {...commonProps}
      data={data}
      title={columnName}
      extInfo={dataType}
      icon={getColumnIcon(data, true)}
      disableHover
    />
  );
}
ColumnAppObject.extractKey = ({ columnName }) => columnName;

export default function SubColumnParamList({ data }) {
  const { columns } = data;

  return (
    <AppObjectList
      list={(columns || []).map(col => ({
        ...col,
        foreignKey: findForeignKeyForColumn(data, col),
      }))}
      AppObjectComponent={ColumnAppObject}
    />
  );
}
