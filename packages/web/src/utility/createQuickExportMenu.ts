import { ExtensionsDirectory, QuickExportDefinition } from 'dbgate-types';
import getElectron from './getElectron';

export default function createQuickExportMenu(
  extensions: ExtensionsDirectory,
  handler: (fmt: QuickExportDefinition) => Function
) {
  const electron = getElectron();
  if (!electron) {
    return { _skip: true };
  }
  return {
    text: 'Quick export',
    submenu: extensions.quickExports.map(fmt => ({
      text: fmt.label,
      onClick: handler(fmt),
    })),
  };
}
