// @ts-nocheck

import React from 'react';
import theme from './theme';
import styled from 'styled-components';
import { useDropzone } from 'react-dropzone';
import TabsPanel from './TabsPanel';
import TabContent from './TabContent';
import WidgetIconPanel from './widgets/WidgetIconPanel';
import { useCurrentWidget, useLeftPanelWidth, useSetLeftPanelWidth } from './utility/globalState';
import WidgetContainer from './widgets/WidgetContainer';
import ToolBar from './widgets/Toolbar';
import StatusBar from './widgets/StatusBar';
import { useSplitterDrag, HorizontalSplitHandle } from './widgets/Splitter';
import { ModalLayer } from './modals/showModal';
import resolveApi from './utility/resolveApi';

const BodyDiv = styled.div`
  position: fixed;
  top: ${theme.tabsPanel.height + theme.toolBar.height}px;
  left: ${(props) => props.contentLeft}px;
  bottom: ${theme.statusBar.height}px;
  right: 0;
  background-color: ${theme.mainArea.background};
`;

const ToolBarDiv = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: ${theme.toolBar.background};
  height: ${theme.toolBar.height}px;
`;

const IconBar = styled.div`
  position: fixed;
  top: ${theme.toolBar.height}px;
  left: 0;
  bottom: ${theme.statusBar.height}px;
  width: ${theme.widgetMenu.iconSize}px;
  background-color: ${theme.widgetMenu.background};
`;

const LeftPanel = styled.div`
  position: fixed;
  top: ${theme.toolBar.height}px;
  left: ${theme.widgetMenu.iconSize}px;
  bottom: ${theme.statusBar.height}px;
  background-color: ${theme.leftPanel.background};
  display: flex;
`;

const TabsPanelContainer = styled.div`
  display: flex;
  position: fixed;
  top: ${theme.toolBar.height}px;
  left: ${(props) => props.contentLeft}px;
  height: ${theme.tabsPanel.height}px;
  right: 0;
  background-color: ${theme.tabsPanel.background};
  border-top: 1px solid #ccc;

  overflow-x: auto;

  ::-webkit-scrollbar {
    height: 7px;
  }
  ::-webkit-scrollbar-track {
    // -webkit-box-shadow: inset 0 0 2px rgba(0,0,0,0.3); 
    border-radius: 1px;
    background-color: #ddd;
  }
 
  ::-webkit-scrollbar-thumb {
    border-radius: 1px;
    // -webkit-box-shadow: inset 0 0 2px rgba(0,0,0,0.5); 
    background-color: #aaa;
    &:hover {
      background-color: #99c;
    }
  }  
}
`;

const StausBarContainer = styled.div`
  position: fixed;
  height: ${theme.statusBar.height}px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${theme.statusBar.background};
`;

const ScreenHorizontalSplitHandle = styled(HorizontalSplitHandle)`
  position: absolute;
  top: ${theme.toolBar.height}px;
  bottom: ${theme.statusBar.height}px;
`;

const DragAndDropTarget = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: red;
`;

export default function Screen() {
  const currentWidget = useCurrentWidget();
  const leftPanelWidth = useLeftPanelWidth();
  const setLeftPanelWidth = useSetLeftPanelWidth();
  const contentLeft = currentWidget
    ? theme.widgetMenu.iconSize + leftPanelWidth + theme.splitter.thickness
    : theme.widgetMenu.iconSize;
  const toolbarPortalRef = React.useRef();
  const onSplitDown = useSplitterDrag('clientX', (diff) => setLeftPanelWidth((v) => v + diff));

  const onDrop = React.useCallback((files) => {
    // Do something with the files
    console.log('FILES', files);
    files.forEach(async (file) => {
      if (parseInt(file.size, 10) >= 4 * 1024 * 1024) {
        // to big file
        return;
      }

      const formData = new FormData();
      formData.append('data', file);

      const fetchOptions = {
        method: 'POST',
        body: formData,
      };

      const apiBase = resolveApi();
      const resp = await fetch(`${apiBase}/uploads/upload`, fetchOptions);
      const event = await resp.json();

      return event;

      // const reader = new FileReader();

      // reader.onabort = () => console.log('file reading was aborted');
      // reader.onerror = () => console.log('file reading has failed');
      // reader.onload = () => {
      //   // Do whatever you want with the file contents
      //   const binaryStr = reader.result;
      //   console.log(binaryStr);
      // };
      // reader.readAsArrayBuffer(file);
    });
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()}>
      <ToolBarDiv>
        <ToolBar toolbarPortalRef={toolbarPortalRef} />
      </ToolBarDiv>
      <IconBar>
        <WidgetIconPanel />
      </IconBar>
      {!!currentWidget && (
        <LeftPanel>
          <WidgetContainer />
        </LeftPanel>
      )}
      {!!currentWidget && (
        <ScreenHorizontalSplitHandle
          onMouseDown={onSplitDown}
          style={{ left: leftPanelWidth + theme.widgetMenu.iconSize }}
        />
      )}
      <TabsPanelContainer contentLeft={contentLeft}>
        <TabsPanel></TabsPanel>
      </TabsPanelContainer>
      <BodyDiv contentLeft={contentLeft}>
        <TabContent toolbarPortalRef={toolbarPortalRef} />
      </BodyDiv>
      <StausBarContainer>
        <StatusBar />
      </StausBarContainer>
      <ModalLayer />

      {!!isDragActive && (
        <DragAndDropTarget>
          Drop the files here ...
          <input {...getInputProps()} />{' '}
        </DragAndDropTarget>
      )}
    </div>
  );
}
