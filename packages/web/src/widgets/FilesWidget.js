import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useOpenedTabs } from '../utility/globalState';
import ClosedTabAppObject from '../appobj/ClosedTabAppObject';
import { WidgetsInnerContainer } from './WidgetStyles';
import {
  SavedSqlFileAppObject,
  SavedShellFileAppObject,
  SavedChartFileAppObject,
  SavedMarkdownFileAppObject,
} from '../appobj/SavedFileAppObject';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';
import { useFiles } from '../utility/metadataLoaders';
import useHasPermission from '../utility/useHasPermission';

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

function SavedMarkdownFilesList() {
  const files = useFiles({ folder: 'markdown' });

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList list={files} AppObjectComponent={SavedMarkdownFileAppObject} />
      </WidgetsInnerContainer>
    </>
  );
}

export default function FilesWidget() {
  const hasPermission = useHasPermission();
  return (
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Recently closed tabs" name="closedTabs" height="20%">
        <ClosedTabsList />
      </WidgetColumnBarItem>
      {hasPermission('files/sql/read') && (
        <WidgetColumnBarItem title="Saved SQL files" name="sqlFiles" height="15%">
          <SavedSqlFilesList />
        </WidgetColumnBarItem>
      )}
      {hasPermission('files/shell/read') && (
        <WidgetColumnBarItem title="Saved shell files" name="shellFiles" height="15%">
          <SavedShellFilesList />
        </WidgetColumnBarItem>
      )}
      {hasPermission('files/charts/read') && (
        <WidgetColumnBarItem title="Saved charts" name="charts" height="15%">
          <SavedChartFilesList />
        </WidgetColumnBarItem>
      )}
      {hasPermission('files/markdown/read') && (
        <WidgetColumnBarItem title="Saved markdown pages" name="markdown" height="15%">
          <SavedMarkdownFilesList />
        </WidgetColumnBarItem>
      )}
    </WidgetColumnBar>
  );
}
