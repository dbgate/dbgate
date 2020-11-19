import fileFormatBase from './fileFormatBase';
import { FileFormatDefinition } from './types';

const csvFormat: FileFormatDefinition = {
  ...fileFormatBase,
  storageType: 'csv',
  extension: 'csv',
  name: 'CSV',
  readerFunc: 'csvReader',
  writerFunc: 'csvWriter',
};

export default csvFormat;
