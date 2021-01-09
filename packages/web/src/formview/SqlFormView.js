import React from 'react';
import FormView from './FormView';

export default function SqlFormView({ rowData, tableInfo }) {
  return <FormView rowData={rowData} tableInfo={tableInfo} />;
}
