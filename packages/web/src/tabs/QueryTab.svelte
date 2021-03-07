<script lang="ts" context="module">
  const currentQuery = writable(null);

  registerCommand({
    id: 'query.execute',
    category: 'Query',
    name: 'Execute',
    icon: 'icon run',
    toolbar: true,
    keyText: 'F5 | Ctrl+Enter',
    enabledStore: derived(currentQuery, query => query != null),
    onClick: () => get(currentQuery).execute(),
  });
</script>

<script lang="ts">
  import { get_current_component } from 'svelte/internal';

  import { writable, derived, get } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import applySqlTemplate from '../utility/applySqlTemplate';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  const instance = get_current_component();

  $: connection = useConnectionInfo({ conid });

  const { editorState, setEditorData } = useEditorData({
    tabid,
    loadFromArgs:
      initialArgs && initialArgs.sqlTemplate
        ? () => applySqlTemplate(initialArgs.sqlTemplate, $extensions, $$props)
        : null,
  });
</script>

<VerticalSplitter>
  <svelte:fragment slot="1">
    <SqlEditor
      engine={$connection && $connection.engine}
      value={$editorState.value || ''}
      on:input={e => setEditorData(e.detail)}
      on:focus={() => currentQuery.set(instance)}
    />
  </svelte:fragment>
</VerticalSplitter>
