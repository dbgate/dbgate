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

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export const activator = createActivator('PerspectiveTab', true);

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
    config={$config}
    setConfig={(value, reload) => {
      if (reload) {
        cache.clear();
      }
      config.update(value);
      if (reload) {
        loadedCounts.set({});
      }
    }}
    {cache}
    {loadedCounts}
  />

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="perspective.refresh" />
  </svelte:fragment>
</ToolStripContainer>
