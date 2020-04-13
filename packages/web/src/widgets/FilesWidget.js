import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useOpenedTabs } from '../utility/globalState';
import openedTabAppObject from '../appobj/openedTabAppObject';
import { SearchBoxWrapper, InnerContainer, Input, MainContainer, OuterContainer, WidgetTitle } from './WidgetStyles';

function OpenedTabsList() {
  const tabs = useOpenedTabs();
  console.log('TABS', tabs);

  return (
    <>
      <WidgetTitle>Opened tabs</WidgetTitle>
      <InnerContainer>
        <AppObjectList list={tabs} makeAppObj={openedTabAppObject()} />
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
      <OuterContainer></OuterContainer>
    </MainContainer>
  );
}
