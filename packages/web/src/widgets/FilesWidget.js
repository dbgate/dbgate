import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useOpenedTabs, useSavedSqlFiles } from '../utility/globalState';
import openedTabAppObject from '../appobj/openedTabAppObject';
import {
  SearchBoxWrapper,
  WidgetsInnerContainer,
  WidgetsMainContainer,
  WidgetsOuterContainer,
  WidgetTitle,
} from './WidgetStyles';
import savedSqlFileAppObject from '../appobj/savedSqlFileAppObject';

function OpenedTabsList() {
  const tabs = useOpenedTabs();

  return (
    <>
      <WidgetTitle>Recently closed tabs</WidgetTitle>
      <WidgetsInnerContainer>
        <AppObjectList list={tabs} makeAppObj={openedTabAppObject()} />
      </WidgetsInnerContainer>
    </>
  );
}

function SavedSqlFilesList() {
  const files = useSavedSqlFiles();

  return (
    <>
      <WidgetTitle>Saved SQL files</WidgetTitle>
      <WidgetsInnerContainer>
        <AppObjectList list={files} makeAppObj={savedSqlFileAppObject()} />
      </WidgetsInnerContainer>
    </>
  );
}

export default function FilesWidget() {
  return (
    <WidgetsMainContainer>
      <WidgetsOuterContainer>
        <OpenedTabsList />
      </WidgetsOuterContainer>
      <WidgetsOuterContainer>
        <SavedSqlFilesList />
      </WidgetsOuterContainer>
    </WidgetsMainContainer>
  );
}
