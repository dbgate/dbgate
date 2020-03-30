import ReactDOM from 'react-dom';
import React from 'react';
import useModalState from '../modals/useModalState';
import ConnectionModal from '../modals/ConnectionModal';
import styled from 'styled-components';
import theme from '../theme';
import { useOpenedTabs } from '../utility/globalState';

const ToolbarContainer = styled.div`
  display: flex;
  user-select: none;
`;

export const ToolbarButton = styled.div`
  // height: ${theme.toolBar.height - 5}px;
  // border: 1px solid gray;
  padding: 5px;
  margin: 2px;
  //background-color: #777;
  background-color: #337ab7;
  border-color: #2e6da4;  color: white;
  border-radius: 2px;

  &:hover {
    background-color: #286090;
  }
`;

export default function ToolBar({ toolbarPortalRef }) {
  const modalState = useModalState();
  const tabs = useOpenedTabs();
  const selectedTab = tabs.find(x => x.selected);
//   React.useEffect(() => {
//     const node = toolbarPortalRef.current;
//     if (node) {
//       ReactDOM.unmountComponentAtNode(node);
//       while (node.lastElementChild) {
//         node.removeChild(node.lastElementChild);
//       }
//     }
//   }, [selectedTab]);
  return (
    <ToolbarContainer>
      <ConnectionModal modalState={modalState} />
      <ToolbarButton onClick={modalState.open}>Add connection</ToolbarButton>
      <ToolbarContainer ref={toolbarPortalRef}></ToolbarContainer>
    </ToolbarContainer>
  );
}
