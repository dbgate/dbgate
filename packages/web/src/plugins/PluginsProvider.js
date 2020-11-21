import React from 'react';
import _ from 'lodash';
import axios from '../utility/axios';
import { useInstalledPlugins } from '../utility/metadataLoaders';

const PluginsContext = React.createContext(null);

export default function PluginsProvider({ children }) {
  const installedPlugins = useInstalledPlugins();
  const [plugins, setPlugins] = React.useState({});
  const handleLoadPlugins = async () => {
    const newPlugins = {};
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
        console.log('Loaded plugin', module);
        newPlugins[installed.name] = module.__esModule ? module.default : module;
      }
    }
    setPlugins((x) =>
      _.pick(
        { ...x, ...newPlugins },
        installedPlugins.map((y) => y.name)
      )
    );
  };
  React.useEffect(() => {
    handleLoadPlugins();
  }, [installedPlugins]);
  return <PluginsContext.Provider value={plugins}>{children}</PluginsContext.Provider>;
}

export function usePlugins() {
  const installed = useInstalledPlugins();
  const loaded = React.useContext(PluginsContext);

  return React.useMemo(
    () =>
      installed
        .map((manifest) => ({
          packageName: manifest.name,
          manifest,
          content: loaded[manifest.name],
        }))
        .filter((x) => x.content),
    [installed, loaded]
  );
}
