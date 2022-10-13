<script lang="ts">
  import { SqlDumper } from 'dbgate-tools';
  import { useSettings } from './metadataLoaders';

  const settings = useSettings();

  $: SqlDumper.keywordsCase = $settings?.['sqlEditor.sqlCommandsCase'] || 'upperCase';
</script>
