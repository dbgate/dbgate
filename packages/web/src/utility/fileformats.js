import { usePlugins } from '../plugins/PluginsProvider';
import axios from './axios';
import { FormSchemaSelect } from './forms';

const excelFormat = {
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

const jsonlFormat = {
  storageType: 'jsonl',
  extension: 'jsonl',
  name: 'JSON lines',
  readerFunc: 'jsonLinesReader',
  writerFunc: 'jsonLinesWriter',
};

/** @returns {import('dbgate-types').FileFormatDefinition[]} */
export function buildFileFormats(plugins) {
  const res = [excelFormat, jsonlFormat];
  for (const { content } of plugins) {
    const { fileFormats } = content;
    if (fileFormats) res.push(...fileFormats);
  }
  return res;
}

export function findFileFormat(extensions, storageType) {
  return extensions.fileFormats.find((x) => x.storageType == storageType);
}

export function getFileFormatDirections(format) {
  if (!format) return [];
  const res = [];
  if (format.readerFunc) res.push('source');
  if (format.writerFunc) res.push('target');
  return res;
}

export function getDefaultFileFormat(extensions) {
  return extensions.fileFormats.find((x) => x.storageType == 'csv') || jsonlFormat;
}
