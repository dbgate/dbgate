import { ExtensionsDirectory, QuickExportDefinition } from 'dbgate-types';
import { getExtensions } from '../stores';
import getElectron from './getElectron';

export function createQuickExportMenuItems(handler: (fmt: QuickExportDefinition) => Function) {
  // const electron = getElectron();
  // if (!electron) {
  //   return null;
  // }
  const extensions = getExtensions();
  console.log('extensions', extensions);
  return extensions.quickExports.map(fmt => ({
    text: fmt.label,
    onClick: handler(fmt),
  }));
}

export default function createQuickExportMenu(handler: (fmt: QuickExportDefinition) => Function) {
  // const electron = getElectron();
  // if (!electron) {
  //   return { _skip: true };
  // }
  return {
    text: 'Quick export',
    submenu: createQuickExportMenuItems(handler),
  };
}
