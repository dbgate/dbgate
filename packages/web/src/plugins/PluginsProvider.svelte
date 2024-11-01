<script lang="ts" context="module">
  async function loadPlugins(pluginsDict, installedPlugins) {
    window['DBGATE_PACKAGES'] = {
      'dbgate-tools': dbgateTools,
      'dbgate-sqltree': sqlTree,
    };

    // neccessary for older plugins
    window['DBGATE_TOOLS'] = dbgateTools;

    const newPlugins = {};
    for (const installed of installedPlugins || []) {
      if (!_.keys(pluginsDict).includes(installed.name)) {
        console.log('Loading module', installed.name);
        loadingPluginStore.set({
          loaded: false,
          loadingPackageName: installed.name,
        });
        const resp = await apiCall('plugins/script', {
          packageName: installed.name,
        });
        const module = eval(`${resp}; plugin`);
        console.log('Loaded plugin', module);
        const moduleContent = module.__esModule ? module.default : module;
        newPlugins[installed.name] = moduleContent;
      }
    }
    if (installedPlugins) {
      loadingPluginStore.set({
        loaded: true,
        loadingPackageName: null,
      });
    }
    return newPlugins;
  }

  function buildDrivers(plugins) {
    const res = [];
    for (const { content } of plugins) {
      if (content.drivers) res.push(...content.drivers);
    }
    return res;
  }

  function filterByEdition(arr) {
    return arr.filter(x => !x.premiumOnly || isProApp());
  }

  export function buildExtensions(plugins) {
    const extensions = {
      plugins,
      fileFormats: filterByEdition(buildFileFormats(plugins)),
      themes: filterByEdition(buildThemes(plugins)),
      drivers: filterByEdition(buildDrivers(plugins)),
      quickExports: filterByEdition(buildQuickExports(plugins)),
    };
    return extensions;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { extensions, loadingPluginStore } from '../stores';
  import { useInstalledPlugins } from '../utility/metadataLoaders';
  import { buildFileFormats, buildQuickExports } from './fileformats';
  import { buildThemes } from './themes';
  import * as dbgateTools from 'dbgate-tools';
  import * as sqlTree from 'dbgate-sqltree';
  import { apiCall } from '../utility/api';
  import { isProApp } from '../utility/proTools';

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
