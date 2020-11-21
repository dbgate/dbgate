import React from 'react';
import _ from 'lodash';
import axios from '../utility/axios';
import { useInstalledPlugins } from '../utility/metadataLoaders';

const PluginsContext = React.createContext(null);

export default function PluginsProvider({ children }) {
  const installedPlugins = useInstalledPlugins();
  const [plugins, setPlugins] = React.useState({});
  const handleLoadPlugins = async () => {
    setPlugins((x) =>
      _.pick(
        x,
        installedPlugins.map((y) => y.name)
      )
    );
    for (const installed of installedPlugins) {
      if (!_.keys(plugins).includes(installed.name)) {
        console.log('Loading module', installed.name);
        const resp = await axios.request({
          method: 'get',
          url: 'plugins/script',
          params: {
            packageName: installed.name,
          },
        });
        const module = eval(resp.data);
        setPlugins((v) => ({
          ...v,
          [installed.name]: module,
        }));
      }
    }
  };
  React.useEffect(() => {
    handleLoadPlugins();
  }, [installedPlugins]);
  return <PluginsContext.Provider value={plugins}>{children}</PluginsContext.Provider>;
}

export function usePlugins() {
  const installed = useInstalledPlugins();
  const loaded = React.useContext(PluginsContext);
  return installed
    .map((manifest) => ({
      packageName: manifest.name,
      manifest,
      content: loaded[manifest.name],
    }))
    .filter((x) => x.content);
}
