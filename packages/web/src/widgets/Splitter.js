import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import useDimensions from '../utility/useDimensions';

const MainContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const VerticalSplitHandle = styled.div`
  background-color: #ccc;
  height: 4px;
  cursor: row-resize;
  z-index: 1;
`;

const ChildContainer1 = styled.div`
  // flex: 0 0 50%;
  //   flex-basis: 100px;
  //   flex-grow: 1;
  display: flex;
  position: relative;
`;

const ChildContainer2 = styled.div`
  flex: 1;
  // flex: 0 0 50%;
  //   flex-basis: 100px;
  //   flex-grow: 1;
  display: flex;
  position: relative;
`;

export function VerticalSplitter({ children }) {
  const childrenArray = _.isArray(children) ? children : [children];
  if (childrenArray.length !== 1 && childrenArray.length != 2) {
    throw new Error('Splitter must have 1 or 2 children');
  }
  const [refNode, dimensions] = useDimensions();
  const [height1, setHeight1] = React.useState(0);

  React.useEffect(() => {
    setHeight1(dimensions.height / 2);
  }, [dimensions]);

  const [resizeStart, setResizeStart] = React.useState(null);

  React.useEffect(() => {
    if (resizeStart != null) {
      const handleResizeMove = (e) => {
        e.preventDefault();
        let diff = e.clientY - resizeStart;
        setResizeStart(e.clientY);
        setHeight1((v) => v + diff);
      };
      const handleResizeEnd = (e) => {
        e.preventDefault();
        setResizeStart(null);
      };

      document.addEventListener('mousemove', handleResizeMove, true);
      document.addEventListener('mouseup', handleResizeEnd, true);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove, true);
        document.removeEventListener('mouseup', handleResizeEnd, true);
      };
    }
  }, [resizeStart]);

  const handleResizeDown = (e) => {
    setResizeStart(e.clientY);
  };

  const isSplitter = !!childrenArray[1];

  return (
    <MainContainer ref={refNode}>
      <ChildContainer1 style={isSplitter ? { height: height1 } : { flex: '1' }}>{childrenArray[0]}</ChildContainer1>
      {isSplitter && <VerticalSplitHandle onMouseDown={handleResizeDown} />}
      {isSplitter && <ChildContainer2>{childrenArray[1]}</ChildContainer2>}
    </MainContainer>
  );
}
