import React from 'react';
import './index.css';
import Screen from './Screen';
import { CurrentWidgetProvider } from './widgets/useCurrentWidget';
import { SocketProvider } from './utility/SocketProvider';

function App() {
  return (
    <CurrentWidgetProvider>
      <SocketProvider>
        <Screen />
      </SocketProvider>
    </CurrentWidgetProvider>
  );
}

export default App;
