import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import DataGrid from '../datagrid/DataGrid';

export default function TableDataTab({ conid, database, schemaName, pureName }) {
  return <DataGrid params={{ conid, database, schemaName, pureName }} />;
}
