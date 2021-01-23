const jsonlFormat = {
  storageType: 'jsonl',
  extension: 'jsonl',
  name: 'JSON lines',
  readerFunc: 'jsonLinesReader',
  writerFunc: 'jsonLinesWriter',
};

/** @returns {import('dbgate-types').FileFormatDefinition[]} */
export function buildFileFormats(plugins) {
  const res = [jsonlFormat];
  for (const { content } of plugins) {
    const { fileFormats } = content;
    if (fileFormats) res.push(...fileFormats);
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
