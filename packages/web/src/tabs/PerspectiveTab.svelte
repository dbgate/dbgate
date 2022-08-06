<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('PerspectiveTab');

  registerCommand({
    id: 'perspective.refresh',
    category: 'Perspective',
    name: 'Refresh',
    keyText: 'F5 | CtrlOrCommand+R',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon reload',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().refresh(),
  });

  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import { PerspectiveCache } from 'dbgate-datalib';

  import PerspectiveView from '../perspectives/PerspectiveView.svelte';
  import usePerspectiveConfig from '../utility/usePerspectiveConfig';
  import { writable } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import { findEngineDriver } from 'dbgate-tools';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import { extensions } from '../stores';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export const activator = createActivator('PerspectiveTab', true);

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);

  const config = usePerspectiveConfig(tabid);
  const cache = new PerspectiveCache();
  const loadedCounts = writable({});

  export function refresh() {
    cache.clear();
    loadedCounts.set({});
  }
</script>

<ToolStripContainer>
  <PerspectiveView
    {conid}
    {database}
    {schemaName}
    {pureName}
    {driver}
    config={$config}
    setConfig={(value, reload) => {
      if (reload) {
        cache.clear();
      }
      config.update(value);
      // loadedCounts.set({});
    }}
    {cache}
    {loadedCounts}
  />

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="perspective.refresh" />
    <ToolStripCommandButton command="perspective.customJoin" />
  </svelte:fragment>
</ToolStripContainer>
