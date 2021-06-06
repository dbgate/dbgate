import { ExtensionsDirectory, QuickExportDefinition } from 'dbgate-types';

export default function createQuickExportMenu(
  extensions: ExtensionsDirectory,
  handler: (fmt: QuickExportDefinition) => Function
) {
  return {
    text: 'Quick export',
    submenu: extensions.quickExports.map(fmt => ({
      text: fmt.label,
      onClick: handler(fmt),
    })),
  };
}
