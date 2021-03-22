<script lang="ts" context="module">
  const dbgateEnv = {
    axios: axiosInstance,
  };

  async function loadPlugins(pluginsDict, installedPlugins) {
    const newPlugins = {};
    for (const installed of installedPlugins || []) {
      if (!_.keys(pluginsDict).includes(installed.name)) {
        console.log('Loading module', installed.name);
        const resp = await axiosInstance.request({
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
    return newPlugins;
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
    const extensions = {
      plugins,
      fileFormats: buildFileFormats(plugins),
      themes: buildThemes(plugins),
      drivers: buildDrivers(plugins),
    };
    return extensions;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { extensions } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import { useInstalledPlugins } from '../utility/metadataLoaders';
  import { buildFileFormats } from './fileformats';
  import { buildThemes } from './themes';

  let pluginsDict = {};
  const installedPlugins = useInstalledPlugins();

  $: loadPlugins(pluginsDict, $installedPlugins).then(newPlugins => {
    if (_.isEmpty(newPlugins)) return;
    pluginsDict = _.pick(
      { ...pluginsDict, ...newPlugins },
      $installedPlugins.map(y => y.name)
    );
  });

  $: plugins = ($installedPlugins || [])
    .map(manifest => ({
      packageName: manifest.name,
      manifest,
      content: pluginsDict[manifest.name],
    }))
    .filter(x => x.content);

  $: $extensions = buildExtensions(plugins);
</script>
