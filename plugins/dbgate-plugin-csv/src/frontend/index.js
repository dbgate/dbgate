const fileFormat = {
  packageName: 'dbgate-plugin-csv',
  // file format identifier
  storageType: 'csv',
  // file extension without leading dot
  extension: 'csv',
  // human readable file format name
  name: 'CSV',
  // function name from backend, which contains reader factory, postfixed by package name
  readerFunc: 'reader@dbgate-plugin-csv',
  // function name from backend, which contains writer factory, postfixed by package name
  writerFunc: 'writer@dbgate-plugin-csv',
  // optional list of format arguments, which can be edited from UI
  args: [
    {
      type: 'select',
      name: 'delimiter',
      label: 'Delimiter',
      options: [
        { name: 'Auto-detect', value: '' },
        { name: 'Comma (,)', value: ',' },
        { name: 'Semicolon (;)', value: ';' },
        { name: 'Tab', value: '\t' },
        { name: 'Pipe (|)', value: '|' },
      ],
      apiName: 'delimiter',
    },
    {
      type: 'checkbox',
      name: 'quoted',
      label: 'Quoted',
      apiName: 'quoted',
      direction: 'target',
    },
    {
      type: 'checkbox',
      name: 'header',
      label: 'Has header row',
      apiName: 'header',
      default: true,
    },
  ],
};

export default {
  fileFormats: [fileFormat],

  quickExports: [
    {
      label: 'CSV file',
      extension: 'csv',
      createWriter: (fileName) => ({
        functionName: 'writer@dbgate-plugin-csv',
        props: {
          fileName,
          delimiter: ',',
        },
      }),
    },
    {
      label: 'CSV file (semicolon separated)',
      extension: 'csv',
      createWriter: (fileName) => ({
        functionName: 'writer@dbgate-plugin-csv',
        props: {
          fileName,
          delimiter: ';',
        },
      }),
    },
  ],
};
