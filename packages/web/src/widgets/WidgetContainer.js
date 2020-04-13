import React from 'react';
import { useCurrentWidget } from '../utility/globalState';
import DatabaseWidget from './DatabaseWidget';
import FilesWidget from './FilesWidget';

export default function WidgetContainer() {
  const currentWidget = useCurrentWidget();
  if (currentWidget === 'database') return <DatabaseWidget />;
  if (currentWidget === 'file') return <FilesWidget />;
  return null;
}
