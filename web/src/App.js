import React from 'react';
import './index.css';
import Screen from './Screen';
import { CurrentWidgetProvider, CurrentDatabaseProvider, OpenedTabsProvider } from './utility/globalState';
import { SocketProvider } from './utility/SocketProvider';

function App() {
  return (
    <CurrentWidgetProvider>
      <CurrentDatabaseProvider>
        <SocketProvider>
          <OpenedTabsProvider>
            <Screen />
          </OpenedTabsProvider>
        </SocketProvider>
      </CurrentDatabaseProvider>
    </CurrentWidgetProvider>
  );
}

export default App;
