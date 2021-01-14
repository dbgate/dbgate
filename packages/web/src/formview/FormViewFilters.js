import React from 'react';
import _ from 'lodash';
import { ManagerInnerContainer } from '../datagrid/ManagerStyles';
import styled from 'styled-components';
import ColumnLabel from '../datagrid/ColumnLabel';
import { TextField } from '../utility/inputs';
import { getFilterType } from 'dbgate-filterparser';
import DataFilterControl from '../datagrid/DataFilterControl';
import InlineButton from '../widgets/InlineButton';
import { FontIcon } from '../icons';

const ColumnWrapper = styled.div`
  margin: 5px;
`;
const ColumnNameWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const TextFieldWrapper = styled.div`
  display: flex;
`;
const StyledTextField = styled(TextField)`
  flex: 1;
`;

export default function FormViewFilters(props) {
  const { formDisplay } = props;
  if (!formDisplay || !formDisplay.baseTable || !formDisplay.baseTable.primaryKey) return null;
  const { baseTable } = formDisplay;
  const { formViewKey, formFilterColumns, filters } = formDisplay.config || {};

  const allFilterNames = _.union(_.keys(filters || {}), formFilterColumns || []);
  console.log('filters', filters);

  return (
    <ManagerInnerContainer style={{ maxWidth: props.managerSize }}>
      {baseTable.primaryKey.columns.map((col) => (
        <ColumnWrapper key={col.columnName}>
          <ColumnNameWrapper>
            <div>
              <FontIcon icon="img primary-key" />
              <ColumnLabel {...baseTable.columns.find((x) => x.columnName == col.columnName)} />
            </div>
          </ColumnNameWrapper>
          <TextFieldWrapper>
            <StyledTextField value={formViewKey && formViewKey[col.columnName]} />
          </TextFieldWrapper>
        </ColumnWrapper>
      ))}
      {allFilterNames.map((columnName) => {
        const column = baseTable.columns.find((x) => x.columnName == columnName);
        if (!column) return null;
        return (
          <ColumnWrapper key={columnName}>
            <ColumnNameWrapper>
              <ColumnLabel {...column} />
              <InlineButton
                square
                onClick={() => {
                  formDisplay.removeFilter(column.columnName);
                }}
              >
                <FontIcon icon="icon delete" />
              </InlineButton>
            </ColumnNameWrapper>
            <DataFilterControl
              filterType={getFilterType(column.dataType)}
              filter={filters[column.columnName]}
              setFilter={(value) => formDisplay.setFilter(column.columnName, value)}
            />
          </ColumnWrapper>
        );
      })}
    </ManagerInnerContainer>
  );
}
