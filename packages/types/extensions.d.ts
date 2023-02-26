import { EngineDriver } from './engines';

export interface FileFormatDefinition {
  storageType: string;
  extension: string;
  extensions?: string[];
  name: string;
  readerFunc?: string;
  writerFunc?: string;
  args?: any[];
  addFileToSourceList?: (
    file: {
      fileName: string;
      shortName: string;
    },
    newSources: string[],
    newValues: {
      [key: string]: any;
    }
  ) => void;
  getDefaultOutputName?: (sourceName, values) => string;
  getOutputParams?: (sourceName, values) => any;
}

export interface ThemeDefinition {
  themeClassName: string;
  themeName: string;
  themeType: 'light' | 'dark';
  themeCss?: string;
}

export interface PluginDefinition {
  packageName: string;
  manifest: any;
  content: any;
}

export interface QuickExportDefinition {
  label: string;
  createWriter: (fileName: string, dataName?: string) => { functionName: string; props: any };
  extension: string;
  noFilenameDependency?: boolean;
}

export interface ExtensionsDirectory {
  plugins: PluginDefinition[];
  fileFormats: FileFormatDefinition[];
  quickExports: QuickExportDefinition[];
  drivers: EngineDriver[];
  themes: ThemeDefinition[];
}
