import React from 'react';
import { usePlugins } from '../plugins/PluginsProvider';
import { buildFileFormats } from './fileformats';

const ExtensionsContext = React.createContext(buildExtensions([]));

export function ExtensionsProvider({ children }) {
  const plugins = usePlugins();
  const extensions = React.useMemo(() => buildExtensions(plugins), [plugins]);
  return <ExtensionsContext.Provider value={extensions}>{children}</ExtensionsContext.Provider>;
}

export function buildExtensions(plugins) {
  const extensions = {
    plugins,
    fileFormats: buildFileFormats(plugins),
  };
  return extensions;
}

export default function useExtensions() {
  return React.useContext(ExtensionsContext);
}
