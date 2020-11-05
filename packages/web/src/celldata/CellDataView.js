import React from 'react';
import { SelectField } from '../utility/inputs';
import ErrorInfo from '../widgets/ErrorInfo';
import styled from 'styled-components';
import TextCellView from './TextCellView';

const Toolbar = styled.div`
  display: flex;
  background: #ccc;
  align-items: center;
`;

const MainWrapper = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`;

const DataWrapper = styled.div`
  display: flex;
  flex: 1;
`;

const formats = [
  {
    type: 'text',
    title: 'Text',
    Component: TextCellView,
    single: true,
  },
];

export default function CellDataView({ selection, grider }) {
  const [selectedFormat, setSelectedFormat] = React.useState(formats[0]);
  let value = null;
  if (grider && selection.length == 1) {
    const rowData = grider.getRowData(selection[0].row);
    const { column } = selection[0];
    if (rowData) value = rowData[column];
  }
  const { Component } = selectedFormat || {};

  return (
    <MainWrapper>
      <Toolbar>
        Format:
        <SelectField
          value={selectedFormat && selectedFormat.type}
          onChange={(value) => setSelectedFormat(formats.find((x) => x.type == value))}
        >
          {formats.map((fmt) => (
            <option value={fmt.type} key={fmt.type}>
              {fmt.title}
            </option>
          ))}
        </SelectField>
      </Toolbar>

      <DataWrapper>
        {selectedFormat == null || (selectedFormat.single && value == null) ? (
          <ErrorInfo message="Must be selected one cell" />
        ) : (
          <Component value={value} grider={grider} selection={selection} />
        )}
      </DataWrapper>
    </MainWrapper>
  );
}
