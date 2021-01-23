import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { ManagerInnerContainer } from '../datagrid/ManagerStyles';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';
import keycodes from '../utility/keycodes';

const Row = styled.div`
  // margin-left: 5px;
  // margin-right: 5px;
  display: flex;
  justify-content: space-between;
  // padding: 5px;
  cursor: pointer;
  &:hover {
    background-color: ${props => props.theme.manager_background_blue[1]};
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
  position: relative;
  top: 5px;
  &:hover {
    background-color: ${props => props.theme.manager_background3};
  }
  padding: 5px;
`;
const EditorInput = styled.input`
  width: calc(100% - 10px);
  background-color: ${props =>
    // @ts-ignore
    props.isError ? props.theme.manager_background_red[1] : props.theme.manager_background};
`;

function ColumnNameEditor({
  onEnter,
  onBlur = undefined,
  focusOnCreate = false,
  blurOnEnter = false,
  existingNames,
  defaultValue = '',
  ...other
}) {
  const theme = useTheme();
  const [value, setValue] = React.useState(defaultValue || '');
  const editorRef = React.useRef(null);
  const isError = value && existingNames && existingNames.includes(value);
  const handleKeyDown = event => {
    if (value && event.keyCode == keycodes.enter && !isError) {
      onEnter(value);
      setValue('');
      if (blurOnEnter) editorRef.current.blur();
    }
    if (event.keyCode == keycodes.escape) {
      setValue('');
      editorRef.current.blur();
    }
  };
  const handleBlur = () => {
    if (value && !isError) {
      onEnter(value);
      setValue('');
    }
    if (onBlur) onBlur();
  };
  React.useEffect(() => {
    if (focusOnCreate) editorRef.current.focus();
  }, [focusOnCreate]);
  return (
    <EditorInput
      theme={theme}
      ref={editorRef}
      type="text"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      value={value}
      onChange={ev => setValue(ev.target.value)}
      // @ts-ignore
      isError={isError}
      {...other}
    />
  );
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
  const theme = useTheme();
  return (
    <Row onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)} theme={theme}>
      <Name>{column.columnName}</Name>
      <Buttons>
        <Icon icon="icon edit" onClick={onEdit} theme={theme} />
        <Icon icon="icon delete" onClick={onRemove} theme={theme} />
        <Icon icon="icon arrow-up" onClick={onUp} theme={theme} />
        <Icon icon="icon arrow-down" onClick={onDown} theme={theme} />
      </Buttons>
    </Row>
  );
}

function dispatchChangeColumns(props, func, rowFunc = null) {
  const { modelState, dispatchModel } = props;
  const model = modelState.value;

  dispatchModel({
    type: 'set',
    value: {
      rows: rowFunc ? model.rows.map(rowFunc) : model.rows,
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
      <ManagerInnerContainer style={{ maxWidth: props.managerSize }}>
        {model.structure.columns.map((column, index) =>
          index == editingColumn ? (
            <ColumnNameEditor
              defaultValue={column.columnName}
              onEnter={columnName => {
                dispatchChangeColumns(
                  props,
                  cols => cols.map((col, i) => (index == i ? { columnName } : col)),
                  row => _.mapKeys(row, (v, k) => (k == column.columnName ? columnName : k))
                );
              }}
              onBlur={() => setEditingColumn(null)}
              focusOnCreate
              blurOnEnter
              existingNames={model.structure.columns.map(x => x.columnName)}
            />
          ) : (
            <ColumnManagerRow
              key={column.uniqueName}
              column={column}
              onEdit={() => setEditingColumn(index)}
              onRemove={() => {
                dispatchChangeColumns(props, cols => cols.filter((c, i) => i != index));
              }}
              onUp={() => {
                dispatchChangeColumns(props, cols => exchange(cols, index, index - 1));
              }}
              onDown={() => {
                dispatchChangeColumns(props, cols => exchange(cols, index, index + 1));
              }}
            />
          )
        )}
        <ColumnNameEditor
          onEnter={columnName => {
            dispatchChangeColumns(props, cols => [...cols, { columnName }]);
          }}
          placeholder="New column"
          existingNames={model.structure.columns.map(x => x.columnName)}
        />
      </ManagerInnerContainer>
    </>
  );
}
