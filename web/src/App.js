import React from 'react';
import './index.css';
import Screen from './Screen';
import { CurrentWidgetProvider, CurrentDatabaseProvider } from './utility/globalState';
import { SocketProvider } from './utility/SocketProvider';

function App() {
  return (
    <CurrentWidgetProvider>
      <CurrentDatabaseProvider>
        <SocketProvider>
          <Screen />
        </SocketProvider>
      </CurrentDatabaseProvider>
    </CurrentWidgetProvider>
  );
}

export default App;
