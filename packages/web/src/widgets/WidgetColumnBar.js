import React from 'react';
import _ from 'lodash';
import {
  SearchBoxWrapper,
  WidgetsInnerContainer,
  WidgetsMainContainer,
  WidgetsOuterContainer,
  WidgetTitle,
} from './WidgetStyles';
import { VerticalSplitHandle, useSplitterDrag } from './Splitter';
import useDimensions from '../utility/useDimensions';
import useTheme from '../theme/useTheme';

export function WidgetColumnBarItem({ title, children, name, height = undefined, collapsed = false }) {
  return <></>;
}

function WidgetContainer({ widget, visible, splitterVisible, parentHeight, initialSize = undefined }) {
  const [size, setSize] = React.useState(null);
  const theme = useTheme();

  const handleResizeDown = useSplitterDrag('clientY', (diff) => setSize((v) => v + diff));

  React.useEffect(() => {
    if (_.isString(initialSize) && initialSize.endsWith('px')) setSize(parseInt(initialSize.slice(0, -2)));
    else if (_.isString(initialSize) && initialSize.endsWith('%'))
      setSize((parentHeight * parseFloat(initialSize.slice(0, -1))) / 100);
    else setSize(parentHeight / 3);
  }, [parentHeight]);

  if (!visible) return null;

  return (
    <>
      <WidgetsOuterContainer style={splitterVisible ? { height: size } : null}>
        {widget.props.children}
      </WidgetsOuterContainer>
      {splitterVisible && <VerticalSplitHandle onMouseDown={handleResizeDown} theme={theme} />}
    </>
  );
}

export default function WidgetColumnBar({ children }) {
  const childArray = _.isArray(children) ? children : [children];
  const [refNode, dimensions] = useDimensions();
  const [collapsedWidgets, setCollapsedWidgets] = React.useState(() =>
    childArray.filter((x) => x && x.props.collapsed).map((x) => x.props.name)
  );
  const toggleCollapsed = (name) => {
    // skip collapse last uncollapsed item
    if (!childArray.find((x) => x.props.name != name && !collapsedWidgets.includes(x.props.name))) return;

    if (collapsedWidgets.includes(name)) setCollapsedWidgets(collapsedWidgets.filter((x) => x != name));
    else setCollapsedWidgets([...collapsedWidgets, name]);
  };

  return (
    <WidgetsMainContainer ref={refNode}>
      {childArray.map((widget, index) => {
        if (!widget) return null;
        return (
          <React.Fragment key={widget.props.name}>
            <WidgetTitle onClick={() => toggleCollapsed(widget.props.name)}>{widget.props.title}</WidgetTitle>
            <WidgetContainer
              parentHeight={dimensions && dimensions.height}
              visible={!collapsedWidgets.includes(widget.props.name)}
              widget={widget}
              initialSize={widget.props.height}
              splitterVisible={!!childArray.slice(index + 1).find((x) => x && !collapsedWidgets.includes(x.props.name))}
            />
          </React.Fragment>
        );
      })}
    </WidgetsMainContainer>
  );
}
