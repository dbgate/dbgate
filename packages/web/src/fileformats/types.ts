export interface FileFormatDefinition {
  storageType: string;
  extension: string;
  readerFunc?: string;
  writerFunc?: string;
  filesTitle: string;
}
