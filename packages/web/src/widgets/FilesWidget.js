import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useOpenedTabs } from '../utility/globalState';
import closedTabAppObject from '../appobj/closedTabAppObject';
import { WidgetsInnerContainer } from './WidgetStyles';
import savedSqlFileAppObject from '../appobj/savedSqlFileAppObject';
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
          makeAppObj={closedTabAppObject()}
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
        <AppObjectList list={files} makeAppObj={savedSqlFileAppObject()} />
      </WidgetsInnerContainer>
    </>
  );
}

export default function FilesWidget() {
  return (
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Recently closed tabs" name="closedTabs" height="50%">
        <ClosedTabsList />
      </WidgetColumnBarItem>
      <WidgetColumnBarItem title="Saved SQL files" name="sqlFiles">
        <SavedSqlFilesList />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  );
}
