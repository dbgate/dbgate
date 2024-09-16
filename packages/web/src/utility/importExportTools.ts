import openNewTab from './openNewTab';

export function openImportExportTab(editorProps, additionalProps = {}) {
  openNewTab(
    {
      tabComponent: 'ImportExportTab',
      title: 'Import/Export',
      icon: 'img export',
      props: additionalProps,
    },
    {
      editor: editorProps,
    }
  );
}
