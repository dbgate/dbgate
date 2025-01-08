const fileFormat = {
  packageName: 'dbgate-plugin-dbf',
  // file format identifier
  storageType: 'dbf',
  // file extension without leading dot
  extension: 'dbf',
  // human readable file format name
  name: 'DBF',
  // function name from backend, which contains reader factory, postfixed by package name
  readerFunc: 'reader@dbgate-plugin-dbf',

  args: [
    {
      type: 'text',
      name: 'encoding',
      label: 'Encoding',
      apiName: 'encoding',
    },
  ],

};

export default {
  fileFormats: [fileFormat],
};
