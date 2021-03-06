import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { DropDownMenuItem, DropDownMenuDivider } from './modals/DropDownMenu';

import { useOpenedTabs, useSetOpenedTabs, useCurrentDatabase, useSetCurrentDatabase } from './utility/globalState';
import { getConnectionInfo } from './utility/metadataLoaders';
import { FontIcon } from './icons';
import useTheme from './theme/useTheme';
import usePropsCompare from './utility/usePropsCompare';
import { useShowMenu } from './modals/showMenu';
import { setSelectedTabFunc } from './utility/common';
import getElectron from './utility/getElectron';

// const files = [
//   { name: 'app.js' },
//   { name: 'BranchCategory', type: 'table', selected: true },
//   { name: 'ApplicationList' },
// ];

const DbGroupHandler = styled.div`
  display: flex;
  flex: 1;
  align-content: stretch;
`;

const DbWrapperHandler = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const DbNameWrapper = styled.div`
  text-align: center;
  font-size: 8pt;
  border-bottom: 1px solid ${props => props.theme.border};
  border-right: 1px solid ${props => props.theme.border};
  cursor: pointer;
  user-select: none;
  padding: 1px;
  position: relative;
  white-space: nowrap;

  overflow: hidden;
  text-overflow: ellipsis;
  // height: 15px;

  &:hover {
    background-color: ${props => props.theme.tabs_background3};
  }
  background-color: ${props =>
    // @ts-ignore
    props.selected ? props.theme.tabs_background1 : 'inherit'};
`;

// const DbNameWrapperInner = styled.div`
//   position: absolute;
//   white-space: nowrap;
// `;

const FileTabItem = styled.div`
  border-right: 1px solid ${props => props.theme.border};
  padding-left: 15px;
  padding-right: 15px;
  flex-shrink: 1;
  flex-grow: 1;
  min-width: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  &:hover {
    color: ${props => props.theme.tabs_font_hover};
  }
  background-color: ${props =>
    // @ts-ignore
    props.selected ? props.theme.tabs_background1 : 'inherit'};
`;

const FileNameWrapper = styled.span`
  margin-left: 5px;
`;

const CloseButton = styled(FontIcon)`
  margin-left: 5px;
  color: gray;
  &:hover {
    color: ${props => props.theme.tabs_font2};
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

function getTabDbName(tab) {
  if (tab.props && tab.props.conid && tab.props.database) return tab.props.database;
  if (tab.props && tab.props.archiveFolder) return tab.props.archiveFolder;
  return '(no DB)';
}

function getTabDbKey(tab) {
  if (tab.props && tab.props.conid && tab.props.database) return `database://${tab.props.database}-${tab.props.conid}`;
  if (tab.props && tab.props.archiveFolder) return `archive://${tab.props.archiveFolder}`;
  return '_no';
}

function getDbIcon(key) {
  if (key.startsWith('database://')) return 'icon database';
  if (key.startsWith('archive://')) return 'icon archive';
  return 'icon file';
}

function buildTooltip(tab) {
  let res = tab.tooltip;
  if (tab.props && tab.props.savedFilePath) {
    if (res) res += '\n';
    res += tab.props.savedFilePath;
  }
  return res;
}

export default function TabsPanel() {
  // const formatDbKey = (conid, database) => `${database}-${conid}`;
  const theme = useTheme();
  const showMenu = useShowMenu();

  const tabs = useOpenedTabs();
  const setOpenedTabs = useSetOpenedTabs();
  const currentDb = useCurrentDatabase();
  const setCurrentDb = useSetCurrentDatabase();

  const { name, connection } = currentDb || {};
  const currentDbKey = name && connection ? `database://${name}-${connection._id}` : '_no';

  const handleTabClick = (e, tabid) => {
    if (e.target.closest('.tabCloseButton')) {
      return;
    }
    setOpenedTabs(files => setSelectedTabFunc(files, tabid));
  };
  const closeTabFunc = closeCondition => tabid => {
    setOpenedTabs(files => {
      const active = files.find(x => x.tabid == tabid);
      if (!active) return files;

      const newFiles = files.map(x => ({
        ...x,
        closedTime: x.closedTime || (closeCondition(x, active) ? new Date().getTime() : undefined),
      }));

      if (newFiles.find(x => x.selected && x.closedTime == null)) {
        return newFiles;
      }

      const selectedIndex = _.findLastIndex(newFiles, x => x.closedTime == null);

      return newFiles.map((x, index) => ({
        ...x,
        selected: index == selectedIndex,
      }));
    });
  };

  const closeTab = closeTabFunc((x, active) => x.tabid == active.tabid);
  const closeAll = () => {
    const closedTime = new Date().getTime();
    setOpenedTabs(tabs =>
      tabs.map(tab => ({
        ...tab,
        closedTime: tab.closedTime || closedTime,
        selected: false,
      }))
    );
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
      e.preventDefault();
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

  React.useEffect(() => {
    const electron = getElectron();
    if (electron) {
      const { ipcRenderer } = electron;
      const activeTab = tabs.find(x => x.selected);
      window['dbgate_activeTabId'] = activeTab ? activeTab.tabid : null;
      ipcRenderer.send('update-menu');
    }
  }, [tabs]);

  // console.log(
  //   't',
  //   tabs.map(x => x.tooltip)
  // );
  const tabsWithDb = tabs
    .filter(x => !x.closedTime)
    .map(tab => ({
      ...tab,
      tabDbName: getTabDbName(tab),
      tabDbKey: getTabDbKey(tab),
    }));
  const tabsByDb = _.groupBy(tabsWithDb, 'tabDbKey');
  const dbKeys = _.keys(tabsByDb).sort();

  const handleSetDb = async props => {
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
      {dbKeys.map(dbKey => (
        <DbWrapperHandler key={dbKey}>
          <DbNameWrapper
            // @ts-ignore
            selected={tabsByDb[dbKey][0].tabDbKey == currentDbKey}
            onClick={() => handleSetDb(tabsByDb[dbKey][0].props)}
            theme={theme}
          >
            <FontIcon icon={getDbIcon(dbKey)} /> {tabsByDb[dbKey][0].tabDbName}
          </DbNameWrapper>
          <DbGroupHandler>
            {_.sortBy(tabsByDb[dbKey], ['title', 'tabid']).map(tab => (
              <FileTabItem
                {...tab}
                title={buildTooltip(tab)}
                key={tab.tabid}
                theme={theme}
                onClick={e => handleTabClick(e, tab.tabid)}
                onMouseUp={e => handleMouseUp(e, tab.tabid)}
                onContextMenu={e => handleContextMenu(e, tab.tabid, tab.props)}
              >
                {<FontIcon icon={tab.busy ? 'icon loading' : tab.icon} />}
                <FileNameWrapper>{tab.title}</FileNameWrapper>
                <CloseButton
                  icon="icon close"
                  className="tabCloseButton"
                  theme={theme}
                  onClick={e => {
                    e.preventDefault();
                    closeTab(tab.tabid);
                  }}
                />
              </FileTabItem>
            ))}
          </DbGroupHandler>
        </DbWrapperHandler>
      ))}
    </>
  );
}
