import { ExtensionsDirectory, QuickExportDefinition } from 'dbgate-types';
import getElectron from './getElectron';

export function createQuickExportMenuItems(
  extensions: ExtensionsDirectory,
  handler: (fmt: QuickExportDefinition) => Function
) {
  const electron = getElectron();
  if (!electron) {
    return null;
  }
  return extensions.quickExports.map(fmt => ({
    text: fmt.label,
    onClick: handler(fmt),
  }));
}

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
    submenu: createQuickExportMenuItems(extensions, handler),
  };
}
