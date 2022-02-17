const fileFormat = {
    packageName: 'dbgate-plugin-xml',
    // file format identifier
    storageType: 'xml@dbgate-plugin-xml',
    // file extension without leading dot
    extension: 'xml',
    // human readable file format name
    name: 'XML file',
    // function name from backend, which contains reader factory, postfixed by package name
    readerFunc: 'reader@dbgate-plugin-xml',
    // function name from backend, which contains writer factory, postfixed by package name
    writerFunc: 'writer@dbgate-plugin-xml',
    // optional list of format arguments, which can be edited from UI
    args: [
      {
        type: 'text',
        name: 'rootElementName',
        label: 'Root element name',
        apiName: 'rootElementName',
        direction: 'target',
      },
      {
        type: 'text',
        name: 'itemElementName',
        label: 'Item element name',
        apiName: 'itemElementName',
      },
    ],
  };
  
  export default {
    fileFormats: [fileFormat],

    quickExports: [
      {
        label: 'XML file',
        extension: 'xml',
        createWriter: (fileName) => ({
          functionName: 'writer@dbgate-plugin-xml',
          props: {
            fileName,
          },
        }),
      },
    ],
  
  };
  