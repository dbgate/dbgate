import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import useDimensions from '../utility/useDimensions';
import dimensions from '../theme/dimensions';
import useTheme from '../theme/useTheme';

const SplitterMainBase = styled.div`
  flex: 1;
  display: flex;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
`;

// @ts-ignore
const VerticalMainContainer = styled(SplitterMainBase)`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const HorizontalMainContainer = styled(SplitterMainBase)`
  flex: 1;
  display: flex;
`;

export const VerticalSplitHandle = styled.div`
  background-color: ${props => props.theme.border};
  height: ${dimensions.splitter.thickness}px;
  cursor: row-resize;
  &:hover {
    background-color: ${props => props.theme.border_background2};
  }
`;

export const HorizontalSplitHandle = styled.div`
  background-color: ${props => props.theme.border};
  width: ${dimensions.splitter.thickness}px;
  cursor: col-resize;
  &:hover {
    background-color: ${props => props.theme.border_background2};
  }
`;

const ChildContainer1 = styled.div`
  // flex: 0 0 50%;
  //   flex-basis: 100px;
  //   flex-grow: 1;
  display: flex;
  position: relative;
  overflow: hidden;
`;

const ChildContainer2 = styled.div`
  flex: 1;
  // flex: 0 0 50%;
  //   flex-basis: 100px;
  //   flex-grow: 1;
  display: flex;
  position: relative;
  overflow: hidden;
`;

export function useSplitterDrag(axes, onResize) {
  const [resizeStart, setResizeStart] = React.useState(null);

  React.useEffect(() => {
    if (resizeStart != null) {
      const handleResizeMove = e => {
        e.preventDefault();
        let diff = e[axes] - resizeStart;
        setResizeStart(e[axes]);
        onResize(diff);
      };
      const handleResizeEnd = e => {
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

  const handleResizeDown = e => {
    setResizeStart(e[axes]);
  };

  return handleResizeDown;
}

function SplitterCore({
  children,
  eventField,
  dimensionField,
  styleField,
  Handle,
  Main,
  initialValue = undefined,
  size = undefined,
  setSize = undefined,
}) {
  const theme = useTheme();
  const childrenArray = _.isArray(children) ? children : [children];
  if (childrenArray.length !== 1 && childrenArray.length != 2) {
    throw new Error('Splitter must have 1 or 2 children');
  }
  const [refNode, dimensions] = useDimensions();
  const [mySize, setMySize] = React.useState(0);
  const size1 = size === undefined ? mySize : size;
  const setSize1 = setSize === undefined ? setMySize : setSize;

  React.useEffect(() => {
    if (_.isString(initialValue) && initialValue.endsWith('px')) setSize1(parseInt(initialValue.slice(0, -2)));
    else if (_.isString(initialValue) && initialValue.endsWith('%'))
      setSize1((dimensions[dimensionField] * parseFloat(initialValue.slice(0, -1))) / 100);
    else setSize1(dimensions[dimensionField] / 2);
  }, [dimensions]);

  const handleResizeDown = useSplitterDrag(eventField, diff => setSize1(v => v + diff));

  const isSplitter = !!childrenArray[1];

  return (
    <Main ref={refNode}>
      <ChildContainer1 style={isSplitter ? { [styleField]: size1 } : { flex: '1' }}>{childrenArray[0]}</ChildContainer1>
      {isSplitter && <Handle onMouseDown={handleResizeDown} theme={theme} />}
      {isSplitter && <ChildContainer2>{childrenArray[1]}</ChildContainer2>}
    </Main>
  );
}

export function VerticalSplitter({ children, ...other }) {
  return (
    <SplitterCore
      eventField="clientY"
      dimensionField="height"
      styleField="height"
      Handle={VerticalSplitHandle}
      Main={VerticalMainContainer}
      {...other}
    >
      {children}
    </SplitterCore>
  );
}

export function HorizontalSplitter({ children, ...other }) {
  return (
    <SplitterCore
      eventField="clientX"
      dimensionField="width"
      styleField="width"
      Handle={HorizontalSplitHandle}
      Main={HorizontalMainContainer}
      {...other}
    >
      {children}
    </SplitterCore>
  );
}
