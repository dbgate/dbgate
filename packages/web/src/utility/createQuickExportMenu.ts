import type { QuickExportDefinition } from 'dbgate-types';
import { currentArchive, getCurrentArchive, getExtensions } from '../stores';
import hasPermission from './hasPermission';

export function createQuickExportMenuItems(handler: (fmt: QuickExportDefinition) => Function, advancedExportMenuItem) {
  const extensions = getExtensions();
  return [
    {
      text: 'Export advanced...',
      ...advancedExportMenuItem,
    },
    { divider: true },
    ...extensions.quickExports.map(fmt => ({
      text: fmt.label,
      onClick: handler(fmt),
    })),
    { divider: true },
    {
      text: 'Current archive',
      onClick: handler({
        extension: 'jsonl',
        label: 'Current archive',
        noFilenameDependency: true,
        createWriter: (fileName, dataName) => ({
          functionName: 'archiveWriter',
          props: {
            fileName: dataName,
            folderName: getCurrentArchive(),
          },
        }),
      }),
    },
  ];
}

export default function createQuickExportMenu(
  handler: (fmt: QuickExportDefinition) => Function,
  advancedExportMenuItem,
  additionalFields = {}
) {
  if (!hasPermission('dbops/export')) {
    return null;
  }

  return {
    text: 'Export',
    submenu: createQuickExportMenuItems(handler, advancedExportMenuItem),
    ...additionalFields,
  };
}
