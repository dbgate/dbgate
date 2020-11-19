import axios from '../utility/axios';
import fileFormatBase from './fileFormatBase';
import { FileFormatDefinition } from './types';

const excelFormat: FileFormatDefinition = {
  ...fileFormatBase,
  storageType: 'excel',
  extension: 'xlsx',
  name: 'MS Excel',
  readerFunc: 'excelSheetReader',
  writerFunc: 'excelSheetWriter',

  addFilesToSourceList: async (file, newSources, newValues) => {
    const resp = await axios.get(`files/analyse-excel?filePath=${encodeURIComponent(file.full)}`);
    const sheetNames = resp.data;
    for (const sheetName of sheetNames) {
      newSources.push(sheetName);
      newValues[`sourceFile_${sheetName}`] = {
        fileName: file.full,
        sheetName,
      };
    }
  },
};

export default excelFormat;
