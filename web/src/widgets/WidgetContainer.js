import React from 'react';
import { useCurrentWidget } from '../utility/globalState';
import DatabaseWidget from './DatabaseWidget';

export default function WidgetContainer() {
  const currentWidget = useCurrentWidget();
  if (currentWidget === 'database') return <DatabaseWidget />;
  return null;
}
