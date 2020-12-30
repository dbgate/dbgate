import React from 'react';
import _ from 'lodash';

import { AppObjectList } from '../appobj/AppObjectList';
import { WidgetsInnerContainer } from './WidgetStyles';
import { SavedFileAppObject } from '../appobj/SavedFileAppObject';
import WidgetColumnBar, { WidgetColumnBarItem } from './WidgetColumnBar';
import { useFiles } from '../utility/metadataLoaders';

function SavedFilesList() {
  const sqlFiles = useFiles({ folder: 'sql' });
  const shellFiles = useFiles({ folder: 'shell' });
  const markdownFiles = useFiles({ folder: 'markdown' });
  const chartFiles = useFiles({ folder: 'charts' });
  const queryFiles = useFiles({ folder: 'query' });

  const files = [
    ...(sqlFiles || []),
    ...(shellFiles || []),
    ...(markdownFiles || []),
    ...(chartFiles || []),
    ...(queryFiles || []),
  ];

  return (
    <>
      <WidgetsInnerContainer>
        <AppObjectList
          list={files}
          AppObjectComponent={SavedFileAppObject}
          groupFunc={(data) => _.startCase(data.folder)}
        />
      </WidgetsInnerContainer>
    </>
  );
}

export default function FilesWidget() {
  return (
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Saved files" name="files">
        <SavedFilesList />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  );
}
