import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { useOpenedTabs } from '../utility/globalState';
import ClosedTabAppObject from '../appobj/ClosedTabAppObject';
import { WidgetsInnerContainer } from './WidgetStyles';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';
import { useFavorites } from '../utility/metadataLoaders';
import useHasPermission from '../utility/useHasPermission';
import { FavoriteFileAppObject } from '../appobj/FavoriteFileAppObject';

function ClosedTabsList() {
  const tabs = useOpenedTabs();

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList
          list={_.sortBy(
            tabs.filter(x => x.closedTime),
            x => -x.closedTime
          )}
          AppObjectComponent={ClosedTabAppObject}
        />
      </WidgetsInnerContainer>
    </>
  );
}

function FavoritesList() {
  const favorites = useFavorites();

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList list={favorites} AppObjectComponent={FavoriteFileAppObject} />
      </WidgetsInnerContainer>
    </>
  );
}

export default function FavoritesWidget() {
  const hasPermission = useHasPermission();
  return (
    <WidgetColumnBar>
      {hasPermission('files/favorites/read') && (
        <WidgetColumnBarItem title="Favorites" name="favorites" height="20%">
          <FavoritesList />
        </WidgetColumnBarItem>
      )}
      <WidgetColumnBarItem title="Recently closed tabs" name="closedTabs">
        <ClosedTabsList />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  );
}
