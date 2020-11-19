import { DatabaseInfo } from 'dbgate-types';
import axios from '../utility/axios';
import fileFormatBase from './fileFormatBase';
import { FileFormatDefinition } from './types';

const excelFormat: FileFormatDefinition = {
  ...fileFormatBase,
  storageType: 'excel',
  extension: 'xlsx',
  name: 'MS Excel',
  readerFunc: 'excelSheetReader',

  addFilesToSourceList: async (file, newSources, newValues) => {
    const resp = await axios.get(`files/analyse-excel?filePath=${encodeURIComponent(file.full)}`);
    const structure: DatabaseInfo = resp.data;
    for (const table of structure.tables) {
      const sourceName = table.pureName;
      newSources.push(sourceName);
      newValues[`sourceFile_${sourceName}`] = {
        fileName: file.full,
        sheetName: table.pureName,
      };
    }
  },
};

export default excelFormat;
