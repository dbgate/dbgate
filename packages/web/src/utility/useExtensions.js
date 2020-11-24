import React from 'react';
import { usePlugins } from '../plugins/PluginsProvider';
import { buildFileFormats } from './fileformats';

const ExtensionsContext = React.createContext(buildExtensions([]));

export function ExtensionsProvider({ children }) {
  const plugins = usePlugins();
  const extensions = React.useMemo(() => buildExtensions(plugins), [plugins]);
  return <ExtensionsContext.Provider value={extensions}>{children}</ExtensionsContext.Provider>;
}

function buildDrivers(plugins) {
  const res = [];
  for (const { content } of plugins) {
    if (content.driver) res.push(content.driver);
    if (content.drivers) res.push(...content.drivers);
  }
  return res;
}

export function buildExtensions(plugins) {
  /** @type {import('dbgate-types').ExtensionsDirectory} */
  const extensions = {
    plugins,
    fileFormats: buildFileFormats(plugins),
    drivers: buildDrivers(plugins),
  };
  return extensions;
}

/** @returns {import('dbgate-types').ExtensionsDirectory} */
export default function useExtensions() {
  return React.useContext(ExtensionsContext);
}
