import React from 'react';
import _ from 'lodash';
import { SelectField } from '../utility/inputs';
import ErrorInfo from '../widgets/ErrorInfo';
import styled from 'styled-components';
import { TextCellViewWrap, TextCellViewNoWrap } from './TextCellView';
import JsonCellView from './JsonCellDataView';
import useTheme from '../theme/useTheme';

const Toolbar = styled.div`
  display: flex;
  background: ${(props) => props.theme.toolbar_background};
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
    type: 'textWrap',
    title: 'Text (wrap)',
    Component: TextCellViewWrap,
    single: true,
  },
  {
    type: 'text',
    title: 'Text (no wrap)',
    Component: TextCellViewNoWrap,
    single: true,
  },
  {
    type: 'json',
    title: 'Json',
    Component: JsonCellView,
    single: true,
  },
];

function autodetect(selection, grider, value) {
  if (_.isString(value)) {
    if (value.startsWith('[') || value.startsWith('{')) return 'json';
  }
  return 'textWrap';
}

export default function CellDataView({ selection, grider }) {
  const [selectedFormatType, setSelectedFormatType] = React.useState('autodetect');
  const theme = useTheme();
  let value = null;
  if (grider && selection.length == 1) {
    const rowData = grider.getRowData(selection[0].row);
    const { column } = selection[0];
    if (rowData) value = rowData[column];
  }
  const autodetectFormatType = React.useMemo(() => autodetect(selection, grider, value), [selection, grider, value]);
  const autodetectFormat = formats.find((x) => x.type == autodetectFormatType);

  const usedFormatType = selectedFormatType == 'autodetect' ? autodetectFormatType : selectedFormatType;
  const usedFormat = formats.find((x) => x.type == usedFormatType);

  const { Component } = usedFormat || {};

  return (
    <MainWrapper>
      <Toolbar theme={theme}>
        Format:
        <SelectField value={selectedFormatType} onChange={(e) => setSelectedFormatType(e.target.value)}>
          <option value="autodetect">Autodetect - {autodetectFormat.title}</option>

          {formats.map((fmt) => (
            <option value={fmt.type} key={fmt.type}>
              {fmt.title}
            </option>
          ))}
        </SelectField>
      </Toolbar>

      <DataWrapper>
        {usedFormat == null || (usedFormat.single && value == null) ? (
          <ErrorInfo message="Must be selected one cell" />
        ) : (
          <Component value={value} grider={grider} selection={selection} />
        )}
      </DataWrapper>
    </MainWrapper>
  );
}
