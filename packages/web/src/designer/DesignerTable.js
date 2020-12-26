import React from 'react';
import styled from 'styled-components';
import ColumnLabel from '../datagrid/ColumnLabel';

const Wrapper = styled.div`
  position: absolute;
  background-color: white;
`;

const Header = styled.div`
  font-weight: bold;
  text-align: center;
  padding: 2px;
  background: lightblue;
  cursor: pointer;
`;

const ColumnsWrapper = styled.div`
  max-height: 400px;
  overflow-y: auto;
  width: 100%;
  margin: 5px;
`;

export default function DesignerTable(props) {
  const { pureName, columns, left, top, onChangeTable, onBringToFront } = props;
  const [movingPosition, setMovingPosition] = React.useState(null);
  const movingPositionRef = React.useRef(null);

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
    //   onChangeTable(
    //     {
    //       ...props,
    //       left: (left || 0) + diffX,
    //       top: (top || 0) + diffY,
    //     },
    //     index
    //   );
  }, []);

  const handleMoveEnd = React.useCallback(
    (e) => {
      if (movingPositionRef.current) {
        onChangeTable({
          ...props,
          left: movingPositionRef.current.left,
          top: movingPositionRef.current.top,
        });
      }

      movingPositionRef.current = null;
      setMovingPosition(null);

      // this.props.model.fixPositions();

      // this.props.designer.changedModel(true);
    },
    [onChangeTable, props]
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

  return (
    <Wrapper
      style={{
        left: movingPosition ? movingPosition.left : left,
        top: movingPosition ? movingPosition.top : top,
      }}
      onMouseDown={() => onBringToFront(props)}
    >
      <Header onMouseDown={headerMouseDown}>{pureName}</Header>
      <ColumnsWrapper>
        {(columns || []).map((column) => (
          <div key={column.columnName}>
            <ColumnLabel {...column} />
          </div>
        ))}
      </ColumnsWrapper>
    </Wrapper>
  );
}
