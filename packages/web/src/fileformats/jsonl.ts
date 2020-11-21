import { FileFormatDefinition } from './types';

const jsonlFormat: FileFormatDefinition = {
  storageType: 'jsonl',
  extension: 'jsonl',
  name: 'JSON lines',
  readerFunc: 'jsonLinesReader',
  writerFunc: 'jsonLinesWriter',
};

export default jsonlFormat;
