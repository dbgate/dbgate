import openNewTab from './openNewTab';

export function openImportExportTab(editorProps) {
  openNewTab(
    {
      tabComponent: 'ImportExportTab',
      title: 'Import/Export',
      icon: 'img export',
    },
    {
      editor: editorProps,
    }
  );
}
