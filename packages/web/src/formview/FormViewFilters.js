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
import keycodes from '../utility/keycodes';

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

function PrimaryKeyFilterEditor({ column, baseTable, formDisplay }) {
  const value = formDisplay.getKeyValue(column.columnName);
  const editorRef = React.useRef(null);

  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.value = value;
    }
  }, [value, editorRef.current]);

  const applyFilter = () => {
    formDisplay.requestKeyValue(column.columnName, editorRef.current.value);
  };

  const cancelFilter = () => {
    formDisplay.cancelRequestKey();
    formDisplay.reload();
  };

  const handleKeyDown = ev => {
    if (ev.keyCode == keycodes.enter) {
      applyFilter();
    }
    if (ev.keyCode == keycodes.escape) {
      cancelFilter();
    }
  };

  return (
    <ColumnWrapper>
      <ColumnNameWrapper>
        <div>
          <FontIcon icon="img primary-key" />
          <ColumnLabel {...baseTable.columns.find(x => x.columnName == column.columnName)} />
        </div>
        {formDisplay.config.formViewKeyRequested && (
          <InlineButton square onClick={cancelFilter}>
            <FontIcon icon="icon delete" />
          </InlineButton>
        )}
      </ColumnNameWrapper>
      <TextFieldWrapper>
        <StyledTextField editorRef={editorRef} onBlur={applyFilter} onKeyDown={handleKeyDown} />
      </TextFieldWrapper>
    </ColumnWrapper>
  );
}

export default function FormViewFilters(props) {
  const { formDisplay } = props;
  if (!formDisplay || !formDisplay.baseTable || !formDisplay.baseTable.primaryKey) return null;
  const { baseTable } = formDisplay;
  const { formFilterColumns, filters } = formDisplay.config || {};

  const allFilterNames = _.union(_.keys(filters || {}), formFilterColumns || []);

  return (
    <ManagerInnerContainer style={{ maxWidth: props.managerSize }}>
      {baseTable.primaryKey.columns.map(col => (
        <PrimaryKeyFilterEditor key={col.columnName} baseTable={baseTable} column={col} formDisplay={formDisplay} />
      ))}
      {allFilterNames.map(uniqueName => {
        const column = formDisplay.columns.find(x => x.uniqueName == uniqueName)
        // const column = baseTable.columns.find(x => x.columnName == columnName);
        if (!column) return null;
        return (
          <ColumnWrapper key={uniqueName}>
            <ColumnNameWrapper>
              <ColumnLabel {...column} />
              <InlineButton
                square
                onClick={() => {
                  formDisplay.removeFilter(column.uniqueName);
                }}
              >
                <FontIcon icon="icon delete" />
              </InlineButton>
            </ColumnNameWrapper>
            <DataFilterControl
              filterType={getFilterType(column.dataType)}
              filter={filters[column.uniqueName]}
              setFilter={value => formDisplay.setFilter(column.uniqueName, value)}
            />
          </ColumnWrapper>
        );
      })}
    </ManagerInnerContainer>
  );
}
