import React from 'react';
import styled from 'styled-components';
import ColumnLabel from '../datagrid/ColumnLabel';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';
import DomTableRef from './DomTableRef';
import _ from 'lodash'

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
  background: ${(props) => props.theme.designtable_background_blue[2]};
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
    background-color: ${props.theme.designtable_background_green[4]};
    `}

  ${(props) =>
    // @ts-ignore
    props.isDragTarget &&
    `
    background-color: ${props.theme.designtable_background_volcano[4]};
    `}
`;

export default function DesignerTable({
  table,
  onChangeTable,
  onBringToFront,
  onRemoveTable,
  onCreateReference,
  sourceDragColumn,
  setSourceDragColumn,
  targetDragColumn,
  setTargetDragColumn,
  onChangeDomTable,
  wrapperRef,
  setChangeToken,
}) {
  const { pureName, columns, left, top, designerId } = table;
  const [movingPosition, setMovingPosition] = React.useState(null);
  const movingPositionRef = React.useRef(null);
  const theme = useTheme();
  const domObjectsRef = React.useRef({});

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
      <Header onMouseDown={headerMouseDown} theme={theme}>
        <HeaderLabel>{pureName}</HeaderLabel>
        <CloseWrapper onClick={() => onRemoveTable(table)} theme={theme}>
          <FontIcon icon="icon close" />
        </CloseWrapper>
      </Header>
      <ColumnsWrapper>
        {(columns || []).map((column) => (
          <ColumnLine
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
          >
            <ColumnLabel {...column} forceIcon />
          </ColumnLine>
        ))}
      </ColumnsWrapper>
    </Wrapper>
  );
}
