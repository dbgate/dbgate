import React from 'react';
import './index.css';
import Screen from './Screen';
import {
  CurrentWidgetProvider,
  CurrentDatabaseProvider,
  OpenedTabsProvider,
  SavedSqlFilesProvider,
  OpenedConnectionsProvider,
} from './utility/globalState';
import { SocketProvider } from './utility/SocketProvider';
import ConnectionsPinger from './utility/ConnectionsPinger';

function App() {
  return (
    <CurrentWidgetProvider>
      <CurrentDatabaseProvider>
        <SocketProvider>
          <OpenedTabsProvider>
            <SavedSqlFilesProvider>
              <OpenedConnectionsProvider>
                <ConnectionsPinger>
                  <Screen />
                </ConnectionsPinger>
              </OpenedConnectionsProvider>
            </SavedSqlFilesProvider>
          </OpenedTabsProvider>
        </SocketProvider>
      </CurrentDatabaseProvider>
    </CurrentWidgetProvider>
  );
}

export default App;
