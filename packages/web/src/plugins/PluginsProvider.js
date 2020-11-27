import React from 'react';
import _ from 'lodash';
import axios from '../utility/axios';
import { useInstalledPlugins } from '../utility/metadataLoaders';

const PluginsContext = React.createContext(null);

const dbgateEnv = {
  axios,
};

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
        const module = eval(`${resp.data}; plugin`);
        console.log('Loaded plugin', module);
        const moduleContent = module.__esModule ? module.default : module;
        if (moduleContent.initialize) moduleContent.initialize(dbgateEnv);
        newPlugins[installed.name] = moduleContent;
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
