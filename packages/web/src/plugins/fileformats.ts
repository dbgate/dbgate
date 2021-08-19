import { FileFormatDefinition, QuickExportDefinition } from 'dbgate-types';

const jsonlFormat = {
  storageType: 'jsonl',
  extension: 'jsonl',
  name: 'JSON lines',
  readerFunc: 'jsonLinesReader',
  writerFunc: 'jsonLinesWriter',
};

const jsonFormat = {
  storageType: 'json',
  extension: 'json',
  name: 'JSON',
  writerFunc: 'jsonArrayWriter',
};

const sqlFormat = {
  storageType: 'sql',
  extension: 'sql',
  name: 'SQL',
  writerFunc: 'sqlDataWriter',
};

const jsonlQuickExport = {
  label: 'JSON lines',
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
    functionName: 'jsonArrayWriter',
    props: {
      fileName,
    },
  }),
};

const sqlQuickExport = {
  label: 'SQL',
  extension: 'sql',
  createWriter: fileName => ({
    functionName: 'sqlDataWriter',
    props: {
      fileName,
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
