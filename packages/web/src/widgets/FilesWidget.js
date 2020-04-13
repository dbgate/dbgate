import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useOpenedTabs, useSavedSqlFiles } from '../utility/globalState';
import openedTabAppObject from '../appobj/openedTabAppObject';
import { SearchBoxWrapper, InnerContainer, Input, MainContainer, OuterContainer, WidgetTitle } from './WidgetStyles';
import savedSqlFileAppObject from '../appobj/savedSqlFileAppObject';

function OpenedTabsList() {
  const tabs = useOpenedTabs();

  return (
    <>
      <WidgetTitle>Opened tabs</WidgetTitle>
      <InnerContainer>
        <AppObjectList list={tabs} makeAppObj={openedTabAppObject()} />
      </InnerContainer>
    </>
  );
}

function SavedSqlFilesList() {
  const files = useSavedSqlFiles();

  return (
    <>
      <WidgetTitle>Saved SQL files</WidgetTitle>
      <InnerContainer>
        <AppObjectList list={files} makeAppObj={savedSqlFileAppObject()} />
      </InnerContainer>
    </>
  );
}

export default function FilesWidget() {
  return (
    <MainContainer>
      <OuterContainer>
        <OpenedTabsList />
      </OuterContainer>
      <OuterContainer>
        <SavedSqlFilesList />
      </OuterContainer>
    </MainContainer>
  );
}
