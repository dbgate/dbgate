import { EngineDriver } from "./engines";

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

export interface PluginDefinition {
  packageName: string;
  manifest: any;
  content: any;
}

export interface ExtensionsDirectory {
  plugins: PluginDefinition[];
  fileFormats: FileFormatDefinition[];
  drivers: EngineDriver[];
}
