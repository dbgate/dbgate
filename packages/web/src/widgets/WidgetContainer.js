import React from 'react';
import { useCurrentWidget } from '../utility/globalState';
import ArchiveWidget from './ArchiveWidget';
import DatabaseWidget from './DatabaseWidget';
import FavoritesWidget from './FavoritesWidget';
import FilesWidget from './FilesWidget';
import PluginsWidget from './PluginsWidget';

function WidgetContainerCore() {
  const currentWidget = useCurrentWidget();
  if (currentWidget === 'database') return <DatabaseWidget />;
  if (currentWidget === 'file') return <FilesWidget />;
  if (currentWidget === 'archive') return <ArchiveWidget />;
  if (currentWidget === 'plugins') return <PluginsWidget />;
  if (currentWidget === 'favorites') return <FavoritesWidget />;
  return null;
}

const WidgetContainer = React.memo(WidgetContainerCore);

export default WidgetContainer;
