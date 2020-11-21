import React from 'react';
import { usePlugins } from '../plugins/PluginsProvider';
import { buildFileFormats } from './fileformats';

export default function useExtensions() {
  const plugins = usePlugins();
  const extensions = React.useMemo(
    () => ({
      plugins,
      fileFormats: buildFileFormats(plugins),
    }),
    [plugins]
  );
  return extensions;
}
