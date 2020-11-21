import React from 'react';
import axios from '../utility/axios';

const PluginsContext = React.createContext(null);

export default function PluginsProvider({ children }) {
  const [plugins, setPlugins] = React.useState(null);
  const handleLoadPlugin = async () => {
    const resp = await axios.request({
      method: 'get',
      url: 'plugins/script',
      params: {
        plugin: 'csv',
      },
    });
    const module = eval(resp.data);
    console.log('MODULE', module);
  };
  React.useEffect(() => {
    handleLoadPlugin();
  }, []);
  return <PluginsContext.Provider value={{ plugins, setPlugins }}>{children}</PluginsContext.Provider>;
}
