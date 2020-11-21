export interface FileFormatDefinition {
  storageType: string;
  extension: string;
  name: string;
  readerFunc?: string;
  writerFunc?: string;
  args?: any[];
  addFilesToSourceList?: (
    file: {
      full: string;
    },
    newSources: string[],
    newValues: {
      [key: string]: any;
    }
  ) => void;
  getDefaultOutputName?: (sourceName, values) => string;
  getOutputParams?: (sourceName, values) => any;
}
