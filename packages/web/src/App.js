import React from 'react';
import './index.css';
import Screen from './Screen';
import {
  CurrentWidgetProvider,
  CurrentDatabaseProvider,
  OpenedTabsProvider,
  SavedSqlFilesProvider,
} from './utility/globalState';
import { SocketProvider } from './utility/SocketProvider';

function App() {
  return (
    <CurrentWidgetProvider>
      <CurrentDatabaseProvider>
        <SocketProvider>
          <OpenedTabsProvider>
            <SavedSqlFilesProvider>
              <Screen />
            </SavedSqlFilesProvider>
          </OpenedTabsProvider>
        </SocketProvider>
      </CurrentDatabaseProvider>
    </CurrentWidgetProvider>
  );
}

export default App;
