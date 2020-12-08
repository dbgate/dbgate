import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useOpenedTabs } from '../utility/globalState';
import ClosedTabAppObject from '../appobj/ClosedTabAppObject';
import { WidgetsInnerContainer } from './WidgetStyles';
import { SavedSqlFileAppObject, SavedShellFileAppObject, SavedChartFileAppObject } from '../appobj/SavedFileAppObject';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';
import { useFiles } from '../utility/metadataLoaders';

function ClosedTabsList() {
  const tabs = useOpenedTabs();

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList
          list={_.sortBy(
            tabs.filter((x) => x.closedTime),
            (x) => -x.closedTime
          )}
          AppObjectComponent={ClosedTabAppObject}
        />
      </WidgetsInnerContainer>
    </>
  );
}

function SavedSqlFilesList() {
  const files = useFiles({ folder: 'sql' });

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList list={files} AppObjectComponent={SavedSqlFileAppObject} />
      </WidgetsInnerContainer>
    </>
  );
}

function SavedShellFilesList() {
  const files = useFiles({ folder: 'shell' });

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList list={files} AppObjectComponent={SavedShellFileAppObject} />
      </WidgetsInnerContainer>
    </>
  );
}

function SavedChartFilesList() {
  const files = useFiles({ folder: 'charts' });

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList list={files} AppObjectComponent={SavedChartFileAppObject} />
      </WidgetsInnerContainer>
    </>
  );
}

export default function FilesWidget() {
  return (
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Recently closed tabs" name="closedTabs" height="20%">
        <ClosedTabsList />
      </WidgetColumnBarItem>
      <WidgetColumnBarItem title="Saved SQL files" name="sqlFiles" height="20%">
        <SavedSqlFilesList />
      </WidgetColumnBarItem>
      <WidgetColumnBarItem title="Saved shell files" name="shellFiles" height="20%">
        <SavedShellFilesList />
      </WidgetColumnBarItem>
      <WidgetColumnBarItem title="Saved charts" name="charts" height="20%">
        <SavedChartFilesList />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  );
}
