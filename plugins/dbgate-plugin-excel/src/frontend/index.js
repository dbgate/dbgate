const fileFormat = {
  packageName: 'dbgate-plugin-excel',
  // file format identifier
  storageType: 'excel',
  // file extension without leading dot
  extension: 'xlsx',
  // human readable file format name
  name: 'MS Excel',
  // function name from backend, which contains reader factory, postfixed by package name
  readerFunc: 'reader@dbgate-plugin-excel',
  // function name from backend, which contains writer factory, postfixed by package name
  writerFunc: 'writer@dbgate-plugin-excel',

  addFileToSourceList: async ({ fileName }, newSources, newValues, apiCall) => {
    const resp = await apiCall('plugins/command', {
      command: 'analyse',
      packageName: 'dbgate-plugin-excel',
      args: {
        fileName,
      },
    });
    const sheetNames = resp;
    for (const sheetName of sheetNames) {
      newSources.push(sheetName);
      newValues[`sourceFile_${sheetName}`] = {
        fileName,
        sheetName,
      };
    }
  },

  args: [
    {
      type: 'checkbox',
      name: 'singleFile',
      label: 'Create single file',
      direction: 'target',
    },
    {
      type: 'number',
      default: '0',
      name: 'skipHeaderRows',
      apiName: 'skipHeaderRows',
      label: 'Skip header rows',
      direction: 'source',
    },
  ],

  getDefaultOutputName: (sourceName, values) => {
    if (values.target_excel_singleFile) {
      return sourceName;
    }
    return null;
  },

  getOutputParams: (sourceName, values) => {
    if (values.target_excel_singleFile) {
      return {
        sheetName: values[`targetName_${sourceName}`] || sourceName,
        fileName: 'data.xlsx',
      };
    }
    return null;
  },
};

export default {
  fileFormats: [fileFormat],
  quickExports: [
    {
      label: 'MS Excel',
      extension: 'xlsx',
      createWriter: (fileName, dataName) => ({
        functionName: 'writer@dbgate-plugin-excel',
        props: {
          fileName,
          sheetName: dataName,
        },
      }),
    },
  ],
};
