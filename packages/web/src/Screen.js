// @ts-nocheck

import React from 'react';
import dimensions from './theme/dimensions';
import styled from 'styled-components';
import TabsPanel from './TabsPanel';
import TabContent from './TabContent';
import WidgetIconPanel from './widgets/WidgetIconPanel';
import { useCurrentWidget, useLeftPanelWidth, useSetLeftPanelWidth } from './utility/globalState';
import WidgetContainer from './widgets/WidgetContainer';
import ToolBar from './widgets/Toolbar';
import StatusBar from './widgets/StatusBar';
import { useSplitterDrag, HorizontalSplitHandle } from './widgets/Splitter';
import { ModalLayer } from './modals/showModal';
import DragAndDropFileTarget from './DragAndDropFileTarget';
import { useUploadsZone } from './utility/UploadsProvider';
import useTheme from './theme/useTheme';
import { MenuLayer } from './modals/showMenu';
import ErrorBoundary from './utility/ErrorBoundary';

const BodyDiv = styled.div`
  position: fixed;
  top: ${dimensions.tabsPanel.height + dimensions.toolBar.height}px;
  left: ${props => props.contentLeft}px;
  bottom: ${dimensions.statusBar.height}px;
  right: 0;
  background-color: ${props => props.theme.content_background};
`;

const ToolBarDiv = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: ${props => props.theme.toolbar_background};
  height: ${dimensions.toolBar.height}px;
`;

const IconBar = styled.div`
  position: fixed;
  top: ${dimensions.toolBar.height}px;
  left: 0;
  bottom: ${dimensions.statusBar.height}px;
  width: ${dimensions.widgetMenu.iconSize}px;
  background-color: ${props => props.theme.widget_background};
`;

const LeftPanel = styled.div`
  position: fixed;
  top: ${dimensions.toolBar.height}px;
  left: ${dimensions.widgetMenu.iconSize}px;
  bottom: ${dimensions.statusBar.height}px;
  background-color: ${props => props.theme.left_background};
  display: flex;
`;

const TabsPanelContainer = styled.div`
  display: flex;
  position: fixed;
  top: ${dimensions.toolBar.height}px;
  left: ${props => props.contentLeft}px;
  height: ${dimensions.tabsPanel.height}px;
  right: 0;
  background-color: ${props => props.theme.tabs_background2};
  border-top: 1px solid ${props => props.theme.border};

  overflow-x: auto;

  ::-webkit-scrollbar {
    height: 7px;
  }
}
`;

const StausBarContainer = styled.div`
  position: fixed;
  height: ${dimensions.statusBar.height}px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.statusbar_background};
`;

const ScreenHorizontalSplitHandle = styled(HorizontalSplitHandle)`
  position: absolute;
  top: ${dimensions.toolBar.height}px;
  bottom: ${dimensions.statusBar.height}px;
`;

// const StyledRoot = styled.div`
//   // color: ${(props) => props.theme.fontColor};
// `;

export default function Screen() {
  const theme = useTheme();
  const currentWidget = useCurrentWidget();
  const leftPanelWidth = useLeftPanelWidth();
  const setLeftPanelWidth = useSetLeftPanelWidth();
  const contentLeft = currentWidget
    ? dimensions.widgetMenu.iconSize + leftPanelWidth + dimensions.splitter.thickness
    : dimensions.widgetMenu.iconSize;
  const toolbarPortalRef = React.useRef();
  const onSplitDown = useSplitterDrag('clientX', diff => setLeftPanelWidth(v => v + diff));

  const { getRootProps, getInputProps, isDragActive } = useUploadsZone();

  return (
    <div {...getRootProps()}>
      <ToolBarDiv theme={theme}>
        <ToolBar toolbarPortalRef={toolbarPortalRef} />
      </ToolBarDiv>
      <IconBar theme={theme}>
        <WidgetIconPanel />
      </IconBar>
      {!!currentWidget && (
        <LeftPanel theme={theme}>
          <ErrorBoundary>
            <WidgetContainer />
          </ErrorBoundary>
        </LeftPanel>
      )}
      {!!currentWidget && (
        <ScreenHorizontalSplitHandle
          onMouseDown={onSplitDown}
          theme={theme}
          style={{ left: leftPanelWidth + dimensions.widgetMenu.iconSize }}
        />
      )}
      <TabsPanelContainer contentLeft={contentLeft} theme={theme}>
        <TabsPanel></TabsPanel>
      </TabsPanelContainer>
      <BodyDiv contentLeft={contentLeft} theme={theme}>
        <TabContent toolbarPortalRef={toolbarPortalRef} />
      </BodyDiv>
      <StausBarContainer theme={theme}>
        <StatusBar />
      </StausBarContainer>
      <ModalLayer />
      <MenuLayer />

      <DragAndDropFileTarget inputProps={getInputProps()} isDragActive={isDragActive} />
    </div>
  );
}
