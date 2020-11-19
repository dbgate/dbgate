import fileFormatBase from './fileFormatBase';
import { FileFormatDefinition } from './types';

const csvFormat: FileFormatDefinition = {
  ...fileFormatBase,
  storageType: 'csv',
  extension: 'csv',
  name: 'CSV',
  readerFunc: 'csvReader',
  writerFunc: 'csvWriter',
  args: [
    {
      type: 'select',
      name: 'delimiter',
      label: 'Delimiter',
      options: [
        { name: 'Comma (,)', value: ',' },
        { name: 'Semicolon (;)', value: ';' },
        { name: 'Tab', value: '\t' },
        { name: 'Pipe (|)', value: '|' },
      ],
      apiName: 'delimiter',
    },
  ],
};

export default csvFormat;
