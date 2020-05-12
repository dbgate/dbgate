import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import theme from './theme';
import { DropDownMenuItem, DropDownMenuDivider } from './modals/DropDownMenu';

import { useOpenedTabs, useSetOpenedTabs, useCurrentDatabase, useSetCurrentDatabase } from './utility/globalState';
import { getIconImage } from './icons';
import { showMenu } from './modals/DropDownMenu';
import { getConnectionInfo } from './utility/metadataLoaders';

// const files = [
//   { name: 'app.js' },
//   { name: 'BranchCategory', type: 'table', selected: true },
//   { name: 'ApplicationList' },
// ];

const DbGroupHandler = styled.div`
  display: flex;
  flex: 1;
`;

const DbWrapperHandler = styled.div`
  display: flex;
  flex-direction: column;
`;

const DbNameWrapper = styled.div`
  text-align: center;
  font-size: 8pt;
  border-top: 1px solid #ccc;
  border-right: 1px solid white;
  cursor: pointer;
  user-select: none;
  &:hover {
    background-color: #aaa;
  }
  background-color: ${(props) =>
    // @ts-ignore
    props.selected ? theme.mainArea.background : 'inherit'};
`;

const FileTabItem = styled.div`
  border-right: 1px solid white;
  padding-left: 15px;
  padding-right: 15px;
  flex-shrink: 1;
  flex-grow: 0;
  min-width: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  &:hover {
    color: ${theme.tabsPanel.hoverFont};
  }
  background-color: ${(props) =>
    // @ts-ignore
    props.selected ? theme.mainArea.background : 'inherit'};
`;

const FileNameWrapper = styled.span`
  margin-left: 5px;
`;

const CloseButton = styled.i`
  margin-left: 5px;
  color: gray;
  &:hover {
    color: ${theme.tabsPanel.hoverFont};
  }
`;

function TabContextMenu({ close, closeAll, closeOthers, closeWithSameDb, closeWithOtherDb, props }) {
  const { database } = props || {};
  const { conid } = props || {};
  return (
    <>
      <DropDownMenuItem onClick={close}>Close</DropDownMenuItem>
      <DropDownMenuItem onClick={closeAll}>Close all</DropDownMenuItem>
      <DropDownMenuItem onClick={closeOthers}>Close others</DropDownMenuItem>
      {conid && database && (
        <DropDownMenuItem onClick={closeWithSameDb}>Close with same DB - {database}</DropDownMenuItem>
      )}
      {conid && database && (
        <DropDownMenuItem onClick={closeWithOtherDb}>Close with other DB than {database}</DropDownMenuItem>
      )}
    </>
  );
}

export default function TabsPanel() {
  const noDbKey = '_no';
  const formatDbKey = (conid, database) => `${database}-${conid}`;

  const tabs = useOpenedTabs();
  const setOpenedTabs = useSetOpenedTabs();
  const currentDb = useCurrentDatabase();
  const setCurrentDb = useSetCurrentDatabase();

  const { name, connection } = currentDb || {};
  const currentDbKey = name && connection ? formatDbKey(connection._id, name) : noDbKey;

  const handleTabClick = (e, tabid) => {
    if (e.target.closest('.tabCloseButton')) {
      return;
    }
    setOpenedTabs((files) =>
      files.map((x) => ({
        ...x,
        selected: x.tabid == tabid,
      }))
    );
  };
  const closeTabFunc = (closeCondition) => (tabid) => {
    setOpenedTabs((files) => {
      const active = files.find((x) => x.tabid == tabid);
      if (!active) return files;
      let index = _.findIndex(files, (x) => x.tabid == tabid);
      const newFiles = files.filter((x) => !closeCondition(x, active));

      if (!newFiles.find((x) => x.selected)) {
        while (index >= newFiles.length) index -= 1;
        if (index >= 0) newFiles[index].selected = true;
      }

      return newFiles;
    });
  };

  const closeTab = closeTabFunc((x, active) => x.tabid == active.tabid);
  const closeAll = () => {
    setOpenedTabs([]);
  };
  const closeWithSameDb = closeTabFunc(
    (x, active) =>
      _.get(x, 'props.conid') == _.get(active, 'props.conid') &&
      _.get(x, 'props.database') == _.get(active, 'props.database')
  );
  const closeWithOtherDb = closeTabFunc(
    (x, active) =>
      _.get(x, 'props.conid') != _.get(active, 'props.conid') ||
      _.get(x, 'props.database') != _.get(active, 'props.database')
  );
  const closeOthers = closeTabFunc((x, active) => x.tabid != active.tabid);
  const handleMouseUp = (e, tabid) => {
    if (e.button == 1) {
      closeTab(tabid);
    }
  };
  const handleContextMenu = (event, tabid, props) => {
    event.preventDefault();
    showMenu(
      event.pageX,
      event.pageY,
      <TabContextMenu
        close={() => closeTab(tabid)}
        closeAll={closeAll}
        closeOthers={() => closeOthers(tabid)}
        closeWithSameDb={() => closeWithSameDb(tabid)}
        closeWithOtherDb={() => closeWithOtherDb(tabid)}
        props={props}
      />
    );
  };

  // console.log(
  //   't',
  //   tabs.map(x => x.tooltip)
  // );
  const tabsWithDb = tabs.map((tab) => ({
    ...tab,
    tabDbName: tab.props && tab.props.conid && tab.props.database ? tab.props.database : '(no DB)',
    tabDbKey:
      tab.props && tab.props.conid && tab.props.database ? formatDbKey(tab.props.conid, tab.props.database) : noDbKey,
  }));
  const tabsByDb = _.groupBy(tabsWithDb, 'tabDbKey');
  const dbKeys = _.keys(tabsByDb).sort();

  const handleSetDb = async (props) => {
    const { conid, database } = props || {};
    if (conid) {
      const connection = await getConnectionInfo({ conid, database });
      if (connection) {
        setCurrentDb({ connection, name: database });
        return;
      }
    }
    setCurrentDb(null);
  };

  return (
    <>
      {dbKeys.map((dbKey) => (
        <DbWrapperHandler key={dbKey}>
          <DbGroupHandler>
            {tabsByDb[dbKey].map((tab) => (
              <FileTabItem
                {...tab}
                title={tab.tooltip}
                key={tab.tabid}
                onClick={(e) => handleTabClick(e, tab.tabid)}
                onMouseUp={(e) => handleMouseUp(e, tab.tabid)}
                onContextMenu={(e) => handleContextMenu(e, tab.tabid, tab.props)}
              >
                {tab.busy ? <i className="fas fa-spinner fa-spin"></i> : getIconImage(tab.icon)}
                <FileNameWrapper>{tab.title}</FileNameWrapper>
                <CloseButton
                  className="fas fa-times tabCloseButton"
                  onClick={(e) => {
                    e.preventDefault();
                    closeTab(tab.tabid);
                  }}
                />
              </FileTabItem>
            ))}
          </DbGroupHandler>
          <DbNameWrapper
            // @ts-ignore
            selected={tabsByDb[dbKey][0].tabDbKey == currentDbKey}
            onClick={() => handleSetDb(tabsByDb[dbKey][0].props)}
          >
            <i className="fas fa-database" /> {tabsByDb[dbKey][0].tabDbName}
          </DbNameWrapper>
        </DbWrapperHandler>
      ))}
    </>
  );
}
