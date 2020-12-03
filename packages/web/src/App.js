import React from 'react';
import './index.css';
import Screen from './Screen';
import {
  CurrentWidgetProvider,
  CurrentDatabaseProvider,
  OpenedTabsProvider,
  OpenedConnectionsProvider,
  LeftPanelWidthProvider,
  CurrentArchiveProvider,
  CurrentThemeProvider,
} from './utility/globalState';
import { SocketProvider } from './utility/SocketProvider';
import ConnectionsPinger from './utility/ConnectionsPinger';
import { ModalLayerProvider } from './modals/showModal';
import UploadsProvider from './utility/UploadsProvider';
import ThemeHelmet from './themes/ThemeHelmet';
import PluginsProvider from './plugins/PluginsProvider';
import { ExtensionsProvider } from './utility/useExtensions';
import { MenuLayerProvider } from './modals/showMenu';

function App() {
  return (
    <CurrentWidgetProvider>
      <CurrentDatabaseProvider>
        <SocketProvider>
          <OpenedTabsProvider>
            <OpenedConnectionsProvider>
              <LeftPanelWidthProvider>
                <ConnectionsPinger>
                  <PluginsProvider>
                    <ExtensionsProvider>
                      <CurrentArchiveProvider>
                        <CurrentThemeProvider>
                          <UploadsProvider>
                            <ModalLayerProvider>
                              <MenuLayerProvider>
                                <ThemeHelmet />
                                <Screen />
                              </MenuLayerProvider>
                            </ModalLayerProvider>
                          </UploadsProvider>
                        </CurrentThemeProvider>
                      </CurrentArchiveProvider>
                    </ExtensionsProvider>
                  </PluginsProvider>
                </ConnectionsPinger>
              </LeftPanelWidthProvider>
            </OpenedConnectionsProvider>
          </OpenedTabsProvider>
        </SocketProvider>
      </CurrentDatabaseProvider>
    </CurrentWidgetProvider>
  );
}

export default App;
