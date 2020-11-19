export interface FileFormatDefinition {
  storageType: string;
  extension: string;
  name: string;
  readerFunc?: string;
  writerFunc?: string;
  addFilesToSourceList: (
    file: {
      full: string;
    },
    newSources: string[],
    newValues: {
      [key: string]: any;
    }
  ) => void;
}
