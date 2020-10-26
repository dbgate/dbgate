import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { filterName } from '@dbgate/datalib';
import { ExpandIcon, FontIcon } from '../icons';
import InlineButton from '../widgets/InlineButton';
import { ManagerInnerContainer } from '../datagrid/ManagerStyles';
import SearchInput from '../widgets/SearchInput';
import { WidgetTitle } from '../widgets/WidgetStyles';
import keycodes from '../utility/keycodes';

const Row = styled.div`
  // margin-left: 5px;
  // margin-right: 5px;
  display: flex;
  justify-content: space-between;
  // padding: 5px;
  cursor: pointer;
  &:hover {
    background-color: lightblue;
  }
`;
const Name = styled.div`
  white-space: nowrap;
  margin: 5px;
`;
const Buttons = styled.div`
  white-space: nowrap;
`;
const Icon = styled(FontIcon)`
  // margin-left: 5px;
  &:hover {
    background-color: gray;
  }
  padding: 5px;
`;
const EditorInput = styled.input`
  width: calc(100% - 10px);
`;

function ColumnNameEditor({ onEnter, onBlur = undefined, focusOnCreate = false, blurOnEnter = false, ...other }) {
  const editorRef = React.useRef(null);
  const handleKeyDown = (event) => {
    if (event.keyCode == keycodes.enter) {
      onEnter(editorRef.current.value);
      editorRef.current.value = '';
      if (blurOnEnter) editorRef.current.blur();
    }
    if (event.keyCode == keycodes.escape) {
      editorRef.current.value = '';
      editorRef.current.blur();
    }
  };
  const handleBlur = () => {
    if (editorRef.current.value) {
      onEnter(editorRef.current.value);
      editorRef.current.value = '';
    }
    if (onBlur) onBlur();
  };
  React.useEffect(() => {
    if (focusOnCreate) editorRef.current.focus();
  }, [focusOnCreate]);
  return <EditorInput ref={editorRef} type="text" onKeyDown={handleKeyDown} onBlur={handleBlur} {...other} />;
}

function exchange(array, i1, i2) {
  const i1r = (i1 + array.length) % array.length;
  const i2r = (i2 + array.length) % array.length;
  const res = [...array];
  [res[i1r], res[i2r]] = [res[i2r], res[i1r]];
  return res;
}

function ColumnManagerRow({ column, onEdit, onRemove, onUp, onDown }) {
  const [isHover, setIsHover] = React.useState(false);
  return (
    <Row onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
      <Name>{column.columnName}</Name>
      <Buttons>
        <Icon icon="fas fa-edit" onClick={onEdit} />
        <Icon icon="fas fa-trash" onClick={onRemove} />
        <Icon icon="fas fa-arrow-up" onClick={onUp} />
        <Icon icon="fas fa-arrow-down" onClick={onDown} />
      </Buttons>
    </Row>
  );
}

function dispatchChangeColumns(props, func) {
  const { modelState, dispatchModel } = props;
  const model = modelState.value;

  dispatchModel({
    type: 'set',
    value: {
      ...model,
      structure: {
        ...model.structure,
        columns: func(model.structure.columns),
      },
    },
  });
}

export default function FreeTableColumnEditor(props) {
  const { modelState, dispatchModel } = props;
  const [editingColumn, setEditingColumn] = React.useState(null);
  const model = modelState.value;
  return (
    <>
      <WidgetTitle>Columns</WidgetTitle>
      <ManagerInnerContainer style={{ maxWidth: props.managerSize }}>
        {model.structure.columns.map((column, index) =>
          index == editingColumn ? (
            <ColumnNameEditor
              defaultValue={column.columnName}
              onEnter={(columnName) => {
                dispatchChangeColumns(props, (cols) => cols.map((col, i) => (index == i ? { columnName } : col)));
              }}
              onBlur={() => setEditingColumn(null)}
              focusOnCreate
              blurOnEnter
            />
          ) : (
            <ColumnManagerRow
              key={column.uniqueName}
              column={column}
              onEdit={() => setEditingColumn(index)}
              onRemove={() => {
                dispatchChangeColumns(props, (cols) => cols.filter((c, i) => i != index));
              }}
              onUp={() => {
                dispatchChangeColumns(props, (cols) => exchange(cols, index, index - 1));
              }}
              onDown={() => {
                dispatchChangeColumns(props, (cols) => exchange(cols, index, index + 1));
              }}
            />
          )
        )}
        <ColumnNameEditor
          onEnter={(columnName) => {
            dispatchChangeColumns(props, (cols) => [...cols, { columnName }]);
          }}
          placeholder="New column"
        />
      </ManagerInnerContainer>
    </>
  );
}
