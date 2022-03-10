import { QuickExportDefinition } from 'dbgate-types';
import { getExtensions } from '../stores';

export function createQuickExportMenuItems(handler: (fmt: QuickExportDefinition) => Function, advancedExportMenuItem) {
  const extensions = getExtensions();
  return [
    ...extensions.quickExports.map(fmt => ({
      text: fmt.label,
      onClick: handler(fmt),
    })),
    { divider: true },
    {
      text: 'More...',
      ...advancedExportMenuItem,
    },
  ];
}

export default function createQuickExportMenu(
  handler: (fmt: QuickExportDefinition) => Function,
  advancedExportMenuItem
) {
  return {
    text: 'Export',
    submenu: createQuickExportMenuItems(handler, advancedExportMenuItem),
  };
}
