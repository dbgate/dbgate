 <script lang="ts">
  import ConnectionList from './ConnectionList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Connections" name="connections" height="50%">
    <ConnectionList />
  </WidgetColumnBarItem>
  <WidgetColumnBarItem title="Tables, views, functions" name="dbObjects">
    TABLES
    <!-- <SqlObjectListWrapper /> -->
  </WidgetColumnBarItem>
</WidgetColumnBar>
