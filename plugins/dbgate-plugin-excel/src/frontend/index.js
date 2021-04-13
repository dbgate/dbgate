let axios;

function initialize(dbgateEnv) {
  axios = dbgateEnv.axios;
}

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

  addFileToSourceList: async ({ fileName }, newSources, newValues) => {
    const resp = await axios.post('plugins/command', {
      command: 'analyse',
      packageName: 'dbgate-plugin-excel',
      args: {
        fileName,
      },
    });
    const sheetNames = resp.data;
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
  initialize,
};
