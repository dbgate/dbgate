export interface FileFormatDefinition {
  storageType: string;
  extension: string;
  name: string;
  readerFunc?: string;
  writerFunc?: string;
}
