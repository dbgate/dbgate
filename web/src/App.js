import React from 'react';
import './index.css';
import Screen from './Screen';
import { CurrentWidgetProvider, CurrentDatabaseProvider, OpenedFilesProvider } from './utility/globalState';
import { SocketProvider } from './utility/SocketProvider';

function App() {
  return (
    <CurrentWidgetProvider>
      <CurrentDatabaseProvider>
        <SocketProvider>
          <OpenedFilesProvider>
            <Screen />
          </OpenedFilesProvider>
        </SocketProvider>
      </CurrentDatabaseProvider>
    </CurrentWidgetProvider>
  );
}

export default App;
