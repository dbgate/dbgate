<script lang="ts" context="module">
  import AppObjectCore from './AppObjectCore.svelte';

  export const extractKey = data => data.path;
  export const createMatcher =
    filter =>
    ({ title, description }) =>
      filterName(filter, title, description);
</script>

<script lang="ts">
  import { apiCall } from '../utility/api';
  import newQuery from '../query/newQuery';
  import { filterName, getSqlFrontMatter, safeJsonParse, setSqlFrontMatter } from 'dbgate-tools';
  import { currentActiveCloudTags } from '../stores';
  import _ from 'lodash';
  import yaml from 'js-yaml';
  import { _t } from '../translations';
  import { currentThemeDefinition } from '../plugins/themes';

  export let data;

  async function handleOpenSqlFile() {
    const fileData = await apiCall('cloud/public-file-data', { path: data.path });
    let queryText = fileData.text;
    if (!relatedToCurrentConnection) {
      const frontMatter = getSqlFrontMatter(fileData.text, yaml);
      if (frontMatter?.autoExecute) {
        queryText = setSqlFrontMatter(fileData.text, _.omit(frontMatter, 'autoExecute'), yaml);
      }
    }
    newQuery({
      initialData: queryText,
      icon: data.icon,
    });
  }

  async function handleUseTheme() {
    const fileData = await apiCall('cloud/public-file-data', { path: data.path });
    $currentThemeDefinition = safeJsonParse(fileData.text);
  }

  function createMenu() {
    if (data?.type == 'sql') {
      return [{ text: _t('common.open', { defaultMessage: 'Open' }), onClick: handleOpenSqlFile }];
    }
    if (data?.type == 'theme') {
      return [{ text: _t('theme.useTheme', { defaultMessage: 'Use theme' }), onClick: handleUseTheme }];
    }
    return [];
  }

  function handleOpenFile() {
    if (data?.type == 'sql') {
      handleOpenSqlFile();
    }
    if (data?.type == 'theme') {
      handleUseTheme();
    }
  }

  $: relatedToCurrentConnection = _.intersection($currentActiveCloudTags, data.tags || []).length > 0;
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  icon={data.icon ?? (data.type == 'sql' ? 'img sql-file' : 'img theme')}
  title={data.title}
  menu={createMenu}
  on:click={handleOpenFile}
  isGrayed={!relatedToCurrentConnection}
  data-testid={`public-cloud-file-${data.path}`}
>
  {#if data.description}
    <div class="info">
      {data.description}
    </div>
  {/if}
</AppObjectCore>

<style>
  .info {
    margin-left: 30px;
    margin-right: 5px;
    color: var(--theme-font-3);
    white-space: nowrap;
  }
</style>
