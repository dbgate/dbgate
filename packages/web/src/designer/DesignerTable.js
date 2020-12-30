import React from 'react';
import styled from 'styled-components';
import { findForeignKeyForColumn } from 'dbgate-tools';
import ColumnLabel from '../datagrid/ColumnLabel';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';
import DomTableRef from './DomTableRef';
import _ from 'lodash';
import { CheckboxField } from '../utility/inputs';
import { useShowMenu } from '../modals/showMenu';
import { DropDownMenuDivider, DropDownMenuItem } from '../modals/DropDownMenu';
import useShowModal from '../modals/showModal';
import InputTextModal from '../modals/InputTextModal';

const Wrapper = styled.div`
  position: absolute;
  // background-color: white;
  background-color: ${(props) => props.theme.designtable_background};
  border: 1px solid ${(props) => props.theme.border};
`;

const Header = styled.div`
  font-weight: bold;
  text-align: center;
  padding: 2px;
  background: ${(props) =>
    // @ts-ignore
    props.objectTypeField == 'views'
      ? props.theme.designtable_background_magenta[2]
      : props.theme.designtable_background_blue[2]};
  border-bottom: 1px solid ${(props) => props.theme.border};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
`;

const ColumnsWrapper = styled.div`
  max-height: 400px;
  overflow-y: auto;
  width: calc(100% - 10px);
  padding: 5px;
`;

const HeaderLabel = styled.div``;

const CloseWrapper = styled.div`
  ${(props) =>
    `
  background-color: ${props.theme.toolbar_background} ;

  &:hover {
    background-color: ${props.theme.toolbar_background2} ;
  }

  &:active:hover {
    background-color: ${props.theme.toolbar_background3};
  }
  `}
`;

// &:hover {
//     background-color: ${(props) => props.theme.designtable_background_gold[1]};
//   }

const ColumnLine = styled.div`
  ${(props) =>
    // @ts-ignore
    !props.isDragSource &&
    // @ts-ignore
    !props.isDragTarget &&
    `
    &:hover {
        background-color: ${props.theme.designtable_background_gold[1]};
    }
    `}

  ${(props) =>
    // @ts-ignore
    props.isDragSource &&
    `
    background-color: ${props.theme.designtable_background_cyan[2]};
    `}

  ${(props) =>
    // @ts-ignore
    props.isDragTarget &&
    `
    background-color: ${props.theme.designtable_background_cyan[2]};
    `}
`;

function TableContextMenu({ remove, setTableAlias, removeTableAlias }) {
  return (
    <>
      <DropDownMenuItem onClick={remove}>Remove</DropDownMenuItem>
      <DropDownMenuDivider />
      <DropDownMenuItem onClick={setTableAlias}>Set table alias</DropDownMenuItem>
      {!!removeTableAlias && <DropDownMenuItem onClick={removeTableAlias}>Remove table alias</DropDownMenuItem>}
    </>
  );
}

function ColumnContextMenu({ setSortOrder, addReference }) {
  return (
    <>
      <DropDownMenuItem onClick={() => setSortOrder(1)}>Sort ascending</DropDownMenuItem>
      <DropDownMenuItem onClick={() => setSortOrder(-1)}>Sort descending</DropDownMenuItem>
      <DropDownMenuItem onClick={() => setSortOrder(0)}>Unsort</DropDownMenuItem>
      {!!addReference && <DropDownMenuItem onClick={addReference}>Add reference</DropDownMenuItem>}
    </>
  );
}

function ColumnDesignerIcons({ column, designerId, designer }) {
  const designerColumn = (designer.columns || []).find(
    (x) => x.designerId == designerId && x.columnName == column.columnName
  );
  if (!designerColumn) return null;
  return (
    <>
      {!!designerColumn.filter && <FontIcon icon="img filter" />}
      {designerColumn.sortOrder > 0 && <FontIcon icon="img sort-asc" />}
      {designerColumn.sortOrder < 0 && <FontIcon icon="img sort-desc" />}
      {!!designerColumn.isGrouped && <FontIcon icon="img group" />}
    </>
  );
}

export default function DesignerTable({
  table,
  onChangeTable,
  onBringToFront,
  onRemoveTable,
  onCreateReference,
  onAddReferenceByColumn,
  onSelectColumn,
  onChangeColumn,
  sourceDragColumn,
  setSourceDragColumn,
  targetDragColumn,
  setTargetDragColumn,
  onChangeDomTable,
  wrapperRef,
  setChangeToken,
  designer,
}) {
  const { pureName, columns, left, top, designerId, alias, objectTypeField } = table;
  const [movingPosition, setMovingPosition] = React.useState(null);
  const movingPositionRef = React.useRef(null);
  const theme = useTheme();
  const domObjectsRef = React.useRef({});
  const showMenu = useShowMenu();
  const showModal = useShowModal();

  const moveStartXRef = React.useRef(null);
  const moveStartYRef = React.useRef(null);

  const handleMove = React.useCallback((e) => {
    let diffX = e.clientX - moveStartXRef.current;
    let diffY = e.clientY - moveStartYRef.current;
    moveStartXRef.current = e.clientX;
    moveStartYRef.current = e.clientY;

    movingPositionRef.current = {
      left: (movingPositionRef.current.left || 0) + diffX,
      top: (movingPositionRef.current.top || 0) + diffY,
    };
    setMovingPosition(movingPositionRef.current);
    // setChangeToken((x) => x + 1);
    changeTokenDebounced.current();
    //   onChangeTable(
    //     {
    //       ...props,
    //       left: (left || 0) + diffX,
    //       top: (top || 0) + diffY,
    //     },
    //     index
    //   );
  }, []);

  const changeTokenDebounced = React.useRef(
    // @ts-ignore
    _.debounce(() => setChangeToken((x) => x + 1), 100)
  );

  const handleMoveEnd = React.useCallback(
    (e) => {
      if (movingPositionRef.current) {
        onChangeTable({
          ...table,
          left: movingPositionRef.current.left,
          top: movingPositionRef.current.top,
        });
      }

      movingPositionRef.current = null;
      setMovingPosition(null);
      changeTokenDebounced.current();
      // setChangeToken((x) => x + 1);

      // this.props.model.fixPositions();

      // this.props.designer.changedModel(true);
    },
    [onChangeTable, table]
  );

  React.useEffect(() => {
    if (movingPosition) {
      document.addEventListener('mousemove', handleMove, true);
      document.addEventListener('mouseup', handleMoveEnd, true);
      return () => {
        document.removeEventListener('mousemove', handleMove, true);
        document.removeEventListener('mouseup', handleMoveEnd, true);
      };
    }
  }, [movingPosition == null, handleMove, handleMoveEnd]);

  const headerMouseDown = React.useCallback(
    (e) => {
      e.preventDefault();
      moveStartXRef.current = e.clientX;
      moveStartYRef.current = e.clientY;
      movingPositionRef.current = { left, top };
      setMovingPosition(movingPositionRef.current);
      // setIsMoving(true);
    },
    [handleMove, handleMoveEnd]
  );

  const dispatchDomColumn = (columnName, dom) => {
    domObjectsRef.current[columnName] = dom;
    onChangeDomTable(new DomTableRef(table, domObjectsRef.current, wrapperRef.current));
    changeTokenDebounced.current();
  };

  const handleSetTableAlias = () => {
    showModal((modalState) => (
      <InputTextModal
        modalState={modalState}
        value={alias || ''}
        label="New alias"
        header="Set table alias"
        onConfirm={(newAlias) => {
          onChangeTable({
            ...table,
            alias: newAlias,
          });
        }}
      />
    ));
  };

  const handleHeaderContextMenu = (event) => {
    event.preventDefault();
    showMenu(
      event.pageX,
      event.pageY,
      <TableContextMenu
        remove={() => onRemoveTable({ designerId })}
        setTableAlias={handleSetTableAlias}
        removeTableAlias={
          alias
            ? () =>
                onChangeTable({
                  ...table,
                  alias: null,
                })
            : null
        }
      />
    );
  };

  const handleColumnContextMenu = (column) => (event) => {
    event.preventDefault();
    const foreignKey = findForeignKeyForColumn(table, column);
    showMenu(
      event.pageX,
      event.pageY,
      <ColumnContextMenu
        setSortOrder={(sortOrder) => {
          onChangeColumn(
            {
              ...column,
              designerId,
            },
            (col) => ({ ...col, sortOrder })
          );
        }}
        addReference={
          foreignKey
            ? () => {
                onAddReferenceByColumn(designerId, foreignKey);
              }
            : null
        }
      />
    );
  };

  return (
    <Wrapper
      theme={theme}
      style={{
        left: movingPosition ? movingPosition.left : left,
        top: movingPosition ? movingPosition.top : top,
      }}
      onMouseDown={() => onBringToFront(table)}
      ref={(dom) => dispatchDomColumn('', dom)}
    >
      <Header
        onMouseDown={headerMouseDown}
        theme={theme}
        onContextMenu={handleHeaderContextMenu}
        // @ts-ignore
        objectTypeField={objectTypeField}
      >
        <HeaderLabel>{alias || pureName}</HeaderLabel>
        <CloseWrapper onClick={() => onRemoveTable(table)} theme={theme}>
          <FontIcon icon="icon close" />
        </CloseWrapper>
      </Header>
      <ColumnsWrapper>
        {(columns || []).map((column) => (
          <ColumnLine
            onContextMenu={handleColumnContextMenu(column)}
            key={column.columnName}
            theme={theme}
            draggable
            ref={(dom) => dispatchDomColumn(column.columnName, dom)}
            // @ts-ignore
            isDragSource={
              sourceDragColumn &&
              sourceDragColumn.designerId == designerId &&
              sourceDragColumn.columnName == column.columnName
            }
            // @ts-ignore
            isDragTarget={
              targetDragColumn &&
              targetDragColumn.designerId == designerId &&
              targetDragColumn.columnName == column.columnName
            }
            onDragStart={(e) => {
              const dragData = {
                ...column,
                designerId,
              };
              setSourceDragColumn(dragData);
              e.dataTransfer.setData('designer_column_drag_data', JSON.stringify(dragData));
            }}
            onDragEnd={(e) => {
              setTargetDragColumn(null);
              setSourceDragColumn(null);
            }}
            onDragOver={(e) => {
              if (sourceDragColumn) {
                e.preventDefault();
                setTargetDragColumn({
                  ...column,
                  designerId,
                });
              }
            }}
            onDrop={(e) => {
              var data = e.dataTransfer.getData('designer_column_drag_data');
              e.preventDefault();
              if (!data) return;
              onCreateReference(sourceDragColumn, targetDragColumn);
              setTargetDragColumn(null);
              setSourceDragColumn(null);
            }}
            onMouseDown={(e) =>
              onSelectColumn({
                ...column,
                designerId,
              })
            }
          >
            <CheckboxField
              checked={
                !!(designer.columns || []).find(
                  (x) => x.designerId == designerId && x.columnName == column.columnName && x.isOutput
                )
              }
              onChange={(e) => {
                if (e.target.checked) {
                  onChangeColumn(
                    {
                      ...column,
                      designerId,
                    },
                    (col) => ({ ...col, isOutput: true })
                  );
                } else {
                  onChangeColumn(
                    {
                      ...column,
                      designerId,
                    },
                    (col) => ({ ...col, isOutput: false })
                  );
                }
              }}
            />
            <ColumnLabel {...column} foreignKey={findForeignKeyForColumn(table, column)} forceIcon />
            <ColumnDesignerIcons column={column} designerId={designerId} designer={designer} />
          </ColumnLine>
        ))}
      </ColumnsWrapper>
    </Wrapper>
  );
}
