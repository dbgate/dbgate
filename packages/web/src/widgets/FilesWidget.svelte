<script lang="ts">
  import SavedFilesList from './SavedFilesList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import { _t } from '../translations';
</script>

<WidgetColumnBar storageName="filesWidget">
  <WidgetColumnBarItem title={_t('files.savedFiles', { defaultMessage: 'Saved files' })} name="files" height="70%">
    <SavedFilesList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
