import type { FileFormatDefinition, QuickExportDefinition } from 'dbgate-types';

const jsonlFormat = {
  storageType: 'jsonl',
  extension: 'jsonl',
  extensions: ['jsonl', 'ndjson'],
  name: 'JSON lines/NDJSON',
  readerFunc: 'jsonLinesReader',
  writerFunc: 'jsonLinesWriter',
};

const jsonFormat = {
  storageType: 'json',
  extension: 'json',
  name: 'JSON',
  readerFunc: 'jsonReader',
  writerFunc: 'jsonWriter',

  args: [
    {
      type: 'select',
      name: 'jsonStyle',
      label: 'JSON style',
      options: [
        { name: 'Array', value: '' },
        { name: 'Object', value: 'object' },
      ],
      apiName: 'jsonStyle',
    },
    {
      type: 'text',
      name: 'keyField',
      label: 'Key field (only for "Object" style)',
      apiName: 'keyField',
    },
    {
      type: 'text',
      name: 'rootField',
      label: 'Root field',
      apiName: 'rootField',
    },
  ],
};

const sqlFormat = {
  storageType: 'sql',
  extension: 'sql',
  name: 'SQL',
  writerFunc: 'sqlDataWriter',
};

const jsonlQuickExport = {
  label: 'JSON lines/NDJSON',
  extension: 'jsonl',
  createWriter: fileName => ({
    functionName: 'jsonLinesWriter',
    props: {
      fileName,
    },
  }),
};

const jsonQuickExport = {
  label: 'JSON',
  extension: 'json',
  createWriter: fileName => ({
    functionName: 'jsonWriter',
    props: {
      fileName,
    },
  }),
};

const sqlQuickExport = {
  label: 'SQL',
  extension: 'sql',
  createWriter: (fileName, dataName) => ({
    functionName: 'sqlDataWriter',
    props: {
      fileName,
      dataName,
    },
  }),
};

export function buildFileFormats(plugins): FileFormatDefinition[] {
  const res = [jsonlFormat, jsonFormat, sqlFormat];
  for (const { content } of plugins) {
    const { fileFormats } = content;
    if (fileFormats) res.push(...fileFormats);
  }
  return res;
}

export function buildQuickExports(plugins): QuickExportDefinition[] {
  const res = [jsonQuickExport, jsonlQuickExport, sqlQuickExport];
  for (const { content } of plugins) {
    if (content.quickExports) res.push(...content.quickExports);
  }
  return res;
}

export function findFileFormat(extensions, storageType) {
  return extensions.fileFormats.find(x => x.storageType == storageType);
}

export function getFileFormatDirections(format) {
  if (!format) return [];
  const res = [];
  if (format.readerFunc) res.push('source');
  if (format.writerFunc) res.push('target');
  return res;
}

export function getDefaultFileFormat(extensions) {
  return extensions.fileFormats.find(x => x.storageType == 'csv') || jsonlFormat;
}
